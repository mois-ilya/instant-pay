# InstantPay 1.0 — Техническая спецификация (Button‑First)

**Статус:** Draft v1.0
**Назначение:** быстрые, приватные платежи в dApp через нативную кнопку кошелька без TonConnect.
**Модель приватности:** до оплаты dApp не получает адрес пользователя, никакие аккаунт‑данные не раскрываются.

---

## 1. Термины и роли

* **dApp** — веб‑приложение, инициирующее оплату.
* **Кошелёк** — приложение/расширение, которое внедряет (inject) API `window.tonkeeper.instantPay`.
* **Invoice (счёт)** — намерение на оплату, задаётся структурой `PaymentRequest` и метками UI.
* **Pay Button** — нативная кнопка кошелька, которую dApp просит отрисовать/обновить.

---

## 2. Обзор протокола

* API инжектируется кошельком в `window.tonkeeper.instantPay`.
* dApp вызывает `setPayButton(params)` столько раз, сколько нужно **до клика** — это атомарные “замены” текущего намерения (см. § 6.3).
  **После клика** до завершения операции **любые изменения запрещены**.
* События: `click` → `sent(boc)` **или** `cancelled(reason)`.
  Дополнительно при фолбэке из SDK: `handoff(url, scheme)` — сигнал «начинай трекинг в блокчейне».
* Фолбэк, если inject недоступен: SDK создаёт стандартный диплинк (mobile: `ton://…`, desktop: `https://app.tonkeeper.com/…`) и отдаёт его в пользовательский колбэк.

---

## 3. Поверхность API (инжект кошельком)

```ts
declare global {
  interface Window {
    tonkeeper?: { instantPay?: InstantPayAPI };
  }
}

export type InstantPaySemver = `${number}.${number}.${number}`; // "1.0.0"

export interface InstantPayAPI {
  /** Семвер протокола. */
  readonly protocolVersion: InstantPaySemver; // например "1.0.0"

  /** Рукопожатие (приватность по умолчанию, без адресов). Синхронно. */
  handshake(app: AppMeta, require?: { minProtocol?: InstantPaySemver }): Handshake;

  /** Создать/обновить нативную кнопку. См. правила замены в §6.3. */
  setPayButton(params: PayButtonParams): void;

  /** Скрыть кнопку (идемпотентно). Не меняет состояние активной операции. */
  hidePayButton(): void;

  /** (Опционально) Прямой сценарий без кнопки. Второстепенно. */
  requestPayment?(
    request: PaymentRequest,
    opts?: { signal?: AbortSignal }
  ): Promise<RequestPaymentResult>;

  /** Активная операция, если есть. */
  getActive(): { invoiceId: string } | null;

  /** Отмена до клика (идемпотентно). После клика — запрещено. */
  cancel(invoiceId?: string): void;

  /** События. */
  events: InstantPayEventEmitter;
}

export interface AppMeta {
  name: string;
  url?: string;
  iconUrl?: string;
}

export interface Handshake {
  protocolVersion: InstantPaySemver;
  wallet: { name: string };            // без версии/адресов
  privacy: { exposesAccount: false };  // явная гарантия
}
```

### 3.1. Ошибки методов (минимальный набор)

* `handshake()` может бросить:

  * `INCOMPATIBLE_VERSION` — не проходит `minProtocol`.
  * `NOT_SUPPORTED` — API выключен/недоступен.
* `setPayButton()` может бросить:

  * `INVALID_PARAMS` — нарушены валидационные правила.
  * `ACTIVE_OPERATION` — изменение после клика запрещено (см. § 6.4).
* `cancel()` может бросить:

  * `ACTIVE_OPERATION` — если уже был клик и операция не завершена.
* `requestPayment()` (если реализован) может вернуть `cancelled` или бросить `NOT_SUPPORTED`.

Коды ошибок — строковые, в `Error.message` (без сложной иерархии).

---

## 4. Модели данных

### 4.1. Актив

```ts
export type Asset =
  | { type: 'ton' }
  | { type: 'jetton'; master: string }; // jetton master address
```

### 4.2. Счёт (PaymentRequest)

```ts
export interface PaymentRequest {
  /**
   * Сумма платежа как ДЕСЯТИЧНАЯ строка.
   * TON: сумма в TON, допускается до 9 знаков после запятой, включает сетевой fee (общий списываемый бюджет).
   * Jetton: количество токена (в десятичном представлении); кошелёк сам округляет до мин. единицы по метаданным токена.
   */
  amount: string;

  /**
   * TON‑адрес получателя платежа.
   * Для jetton — это адрес ПОЛУЧАТЕЛЯ ТОКЕНОВ (не адрес jetton‑wallet контракта).
   */
  recipient: string;

  /** Уникальный UUID счёта (invoice). Используется для идемпотентности и событий. */
  invoiceId: string;

  /** Актив платежа. */
  asset: Asset;

  /**
   * Необязательный ADNL продавца для off‑chain шифрованной метадаты.
   * Строка 64‑симв. hex (32 байта).
   */
  adnlAddress?: string;

  /**
   * Необязательный срок годности счёта как UNIX‑секунды.
   * По истечении клики приводят к cancelled: 'expired'.
   */
  expiresAt?: number;
}
```

### 4.3. Метка кнопки

```ts
export type PayLabel =
  | 'buy' | 'unlock' | 'use' | 'get' | 'open'
  | 'start' | 'retry' | 'show' | 'play' | 'try';
```

Кошелёк сопоставляет метку с локализованным текстом UI. Неизвестная метка трактуется как `'buy'`.

### 4.4. Параметры кнопки

```ts
export interface PayButtonParams {
  request: PaymentRequest;
  label: PayLabel;
  /**
   * Запросить быстрый путь (без лишних подтверждений), если кошелёк сочтёт безопасным.
   * По умолчанию true.
   */
  instantPay?: boolean;
}
```

### 4.5. Результат headless‑пути

```ts
export type RequestPaymentResult =
  | { status: 'sent'; boc: string }                                 // base64 BOC внешнего сообщения
  | { status: 'cancelled'; reason?: CancelReason };

export type CancelReason = 'user' | 'app' | 'wallet' | 'replaced' | 'expired' | 'unsupported_env';
```

**BOC** — base64 внешнего (external) сообщения, которое кошелёк отправил в сеть. dApp/бэкенд по нему может вычислить hash и отслеживать попадание в блоки.

---

## 5. События

```ts
export type InstantPayEvent =
  | { type: 'ready'; handshake: Handshake }                    // по завершении handshake
  | { type: 'click'; invoiceId: string }                       // пользователь нажал кнопку
  | { type: 'sent'; invoiceId: string; boc: string }           // сообщение сформировано и отправлено
  | { type: 'cancelled'; invoiceId: string; reason?: CancelReason }
  | { type: 'handoff'; invoiceId: string; url: string; scheme: 'ton' | 'https' }; // фолбэк
```

```ts
export interface InstantPayEventEmitter {
  on<T extends InstantPayEvent['type']>(
    type: T,
    cb: (e: Extract<InstantPayEvent, { type: T }>) => void
  ): () => void;
  off<T extends InstantPayEvent['type']>(type: T, cb: any): void;
  once<T extends InstantPayEvent['type']>(type: T, cb: any): () => void;
}
```

---

## 6. Поведение кнопки и конкуренция

### 6.1. Жизненный цикл

1. `setPayButton(params)` → рендер кнопки.
2. Пользователь нажимает → `click`.
3. Кошелёк либо отправляет сразу (если возможно) → `sent(boc)`,
   либо показывает подтверждение → итог всё равно `sent(boc)` или `cancelled('user'|'wallet')`.

### 6.2. Срок годности

* Если `expiresAt` прошёл, клик даёт `cancelled('expired')`.

### 6.3. Замены **до клика**

* Повторный `setPayButton()` **до клика** трактуется как замена текущего счёта:

  * Кошелёк эмитит `cancelled { invoiceId: <старый>, reason: 'replaced' }`.
  * Активным становится новый счёт.
* **Рекомендация по инвойсам:** при любом изменении полей `request` используйте **новый** `invoiceId`. Обновлять **только** `label/instantPay` с тем же `invoiceId` допустимо, но изменение суммы/актива/получателя при сохранении `invoiceId` должно приводить к `INVALID_PARAMS`.

### 6.4. Попытки обновления **после клика**

* Любой вызов `setPayButton()` или `cancel()` **после события `click` и до `sent|cancelled`** должен бросать `ACTIVE_OPERATION`.
* Единственный, кто меняет состояние в этот момент — пользователь (через UI кошелька).

### 6.5. `hidePayButton()`

* Прячет UI. Состояние операции не меняет.

---

## 7. Фолбэк (Deep Link)

Когда inject API недоступен/несовместим, SDK должен предоставить фолбэк:

* **Мобильный браузер:** `ton://transfer/...`
* **Десктоп:** `https://app.tonkeeper.com/transfer/...`

### 7.1. Формирование диплинка

Из `PaymentRequest`:

* **TON:**
  `.../transfer/{recipient}?amount={amountTon}&exp={expiresAt}&bin={payloadBase64?}`

* **Jetton:**
  `.../transfer/{recipient}?jetton={master}&amount={amountToken}&exp={expiresAt}&bin={payloadBase64?}`

`amountTon` — десятичная сумма в TON (как в `request.amount`).
`amountToken` — десятичная сумма токена (кошелёк округлит до min units).
`exp` добавляется, если есть `expiresAt`.

**Payload (`bin`, опционально):** base64‑кодированный бинарный cell **InstantPay‑payload v1**:

```
cell ip10_payload$IP10
  magic:uint32 = 0x49503130  ; ASCII 'IP10'
  invoice_id:uint128         ; UUID v4
  has_adnl:uint1
  adnl:bits256?              ; при has_adnl=1
= IP10Payload;
```

* Кошелёк, получая диплинк, **может** встроить этот payload как комментарий/оплату‑payload к выходящему сообщению (тонкости реализации остаются за кошельком).
* Если кошелёк игнорирует `bin`, операция всё равно функциональна; dApp начнёт отслеживание по паре `(recipient, amount, asset, time‑window)`.

### 7.2. Колбэк рендеринга фолбэка

SDK‑метод `setPayButton` принимает пользовательский колбэк, который отрисует вашу кнопку‑фолбэк:

```ts
type FallbackCallback = (ctx: {
  url: string;                     // готовый диплинк
  scheme: 'ton' | 'https';         // выбранная схема
  open: () => void;                // вызвать открытие (на ваш клик)
}) => void | (() => void);
```

* SDK вызывает колбэк, если inject недоступен.
* Когда ваш UI вызывает `ctx.open()`, SDK **эмитит** `handoff { invoiceId, url, scheme }`. Это сигнал dApp «начать трекинг блокчейна».
* Отдельного `cancelled` при фолбэке нет; если пользователь не завершил оплату, dApp может завершить ожидание по таймауту на своей стороне.

---

## 8. Валидаторы (ключевые правила)

* `amount`: `^\d+(\.\d{1,18})?$`

  * TON: рекомендуем максимум 9 знаков после запятой.
  * Jetton: допускается до 18 знаков (кошелёк округлит к min units по метаданным токена).
* `recipient`: валидный TON‑адрес (friendly/raw).
* `invoiceId`: UUID v4 (строка).
* `adnlAddress`: 64‑символьный hex (0‑9a‑f, без `0x`).
* `expiresAt`: UNIX‑время в секундах, > `now`.

Нарушения → `INVALID_PARAMS`.

---

## 9. SDK для dApp (обёртка над inject + фолбэк)

### 9.1. Публичный класс

```ts
export class InstantPaySDK {
  readonly events: InstantPayEventEmitter;
  private api?: InstantPayAPI;
  private hs?: Handshake;

  constructor() {
    this.api = window?.tonkeeper?.instantPay;
    if (this.api) {
      this.hs = this.api.handshake({ name: this._detectAppName(), url: location.origin });
      // форвардинг событий
      (['ready','click','sent','cancelled'] as const).forEach(t => {
        this.api!.events.on(t, (e: any) => this.events.emit(e));
      });
      // сводный ready
      this.events.emit({ type: 'ready', handshake: this.hs });
    }
  }

  get isInjected() { return !!this.api; }
  get handshake()  { return this.hs; }

  setPayButton(params: PayButtonParams, opts?: { onUnsupported?: FallbackCallback }) {
    // 1) валидация (Ajv/Schema)
    this._validate(params);

    // 2) inject‑путь
    if (this.api) { this.api.setPayButton(params); return; }

    // 3) фолбэк
    const url = this._buildDeepLink(params.request);
    const scheme = this._isMobile() ? 'ton' : 'https';
    const open = () => {
      window.location.href = url;
      // Сигнал dApp начать трекать блокчейн
      this.events.emit({ type: 'handoff', invoiceId: params.request.invoiceId, url, scheme });
    };

    if (opts?.onUnsupported) opts.onUnsupported({ url, scheme, open });
  }

  hidePayButton()  { this.api?.hidePayButton(); }
  cancel(id?: string) { this.api?.cancel(id); } // бросит ACTIVE_OPERATION при попытке после click

  // опционально
  requestPayment(req: PaymentRequest) {
    if (!this.api?.requestPayment) throw new Error('NOT_SUPPORTED');
    return this.api.requestPayment(req);
  }

  // ...приватные помощники: _validate, _buildDeepLink, _isMobile, _detectAppName
}
```

### 9.2. Использование в dApp

```ts
const sdk = new InstantPaySDK();

sdk.events.on('handoff', (e) => {
  // dApp/бэкенд начинает отслеживание по invoiceId/recipient/amount/asset/time-window
  startTracking(e.invoiceId);
});

sdk.events.on('sent', (e) => {
  // есть BOC — можно сразу подтвердить клиенту и начать трекинг по message-hash
  acknowledge(e.invoiceId, e.boc);
});

// Пользователь выбирает тариф — просто «заменяем» счёт новым invoiceId
function updatePlan(plan) {
  sdk.setPayButton(
    {
      request: {
        amount: plan.amountTon,               // "0.25"
        recipient: 'EQD...recipient...',
        invoiceId: crypto.randomUUID(),
        asset: { type: 'ton' },
        expiresAt: Math.floor(Date.now()/1000) + 10*60,
        adnlAddress: 'ab12...cd34'           // опционально, hex64
      },
      label: 'buy',
      instantPay: true
    },
    {
      onUnsupported: ({ url, open }) => {
        const btn = document.getElementById('fallback');
        btn.textContent = 'Открыть в Tonkeeper';
        btn.onclick = open;
        return () => { btn.onclick = null; };
      }
    }
  );
}
```

---

## 10. Требования к кошельку (референс/мок)

* Инжектировать `window.tonkeeper.instantPay` **до загрузки dApp** (раньше первого вызова).
* `handshake()` — синхронный, мгновенно возвращает `protocolVersion`, `wallet.name`, `privacy`.
* `setPayButton()`:

  * До клика: замена текущего счёта, эмит `cancelled(replaced)` для старого.
  * После клика: бросать `ACTIVE_OPERATION` на любой вызов `setPayButton`/`cancel`.
  * На просроченном счёте клик → `cancelled(expired)`.
* События:

  * На клик: `click(invoiceId)`.
  * На отправку: `sent(invoiceId, boc)`. BOC — внешнее сообщение.
  * На отмену пользователем/кошельком: `cancelled(invoiceId, 'user'|'wallet')`.
* `requestPayment()` (если реализован) соответствует тем же правилам и возвращает `sent|cancelled`.
* **Без раскрытия адресов** и прочих пользовательских данных до оплаты.
* **ADNL** (если есть) — может использоваться для off‑chain получения шифрованной метадаты (способ вне рамок этой версии).

---

## 11. JSON Schema (ядро)

### 11.1. `payment-request.schema.json`

```json
{
  "$id": "https://schemas.instantpay.dev/payment-request.schema.json",
  "type": "object",
  "required": ["amount","recipient","invoiceId","asset"],
  "properties": {
    "amount": { "type": "string", "pattern": "^[0-9]+(\\.[0-9]{1,18})?$" },
    "recipient": { "type": "string", "minLength": 48, "maxLength": 66 },
    "invoiceId": { "type": "string", "format": "uuid" },
    "asset": {
      "oneOf": [
        { "type": "object", "required": ["type"], "properties": { "type": { "const": "ton" } }, "additionalProperties": false },
        { "type": "object", "required": ["type","master"], "properties": { "type": { "const": "jetton" }, "master": { "type": "string", "minLength": 48, "maxLength": 66 } }, "additionalProperties": false }
      ]
    },
    "adnlAddress": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "expiresAt": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}
```

### 11.2. `pay-button-params.schema.json`

```json
{
  "$id": "https://schemas.instantpay.dev/pay-button-params.schema.json",
  "type": "object",
  "required": ["request","label"],
  "properties": {
    "request": { "$ref": "payment-request.schema.json" },
    "label": {
      "type": "string",
      "enum": ["buy","unlock","use","get","open","start","retry","show","play","try"]
    },
    "instantPay": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

### 11.3. События (`events.schema.json`)

```json
{
  "$id": "https://schemas.instantpay.dev/events.schema.json",
  "oneOf": [
    {
      "type": "object",
      "required": ["type","handshake"],
      "properties": {
        "type": { "const": "ready" },
        "handshake": {
          "type": "object",
          "required": ["protocolVersion","wallet","privacy"],
          "properties": {
            "protocolVersion": { "type": "string" },
            "wallet": { "type": "object", "required": ["name"], "properties": { "name": { "type": "string" } }, "additionalProperties": false },
            "privacy": { "type": "object", "required": ["exposesAccount"], "properties": { "exposesAccount": { "const": false } }, "additionalProperties": false }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    {
      "type": "object",
      "required": ["type","invoiceId"],
      "properties": { "type": { "const": "click" }, "invoiceId": { "type": "string", "format": "uuid" } },
      "additionalProperties": false
    },
    {
      "type": "object",
      "required": ["type","invoiceId","boc"],
      "properties": { "type": { "const": "sent" }, "invoiceId": { "type": "string", "format": "uuid" }, "boc": { "type": "string" } },
      "additionalProperties": false
    },
    {
      "type": "object",
      "required": ["type","invoiceId"],
      "properties": { "type": { "const": "cancelled" }, "invoiceId": { "type": "string", "format": "uuid" }, "reason": { "type": "string", "enum": ["user","app","wallet","replaced","expired","unsupported_env"] } },
      "additionalProperties": false
    },
    {
      "type": "object",
      "required": ["type","invoiceId","url","scheme"],
      "properties": {
        "type": { "const": "handoff" },
        "invoiceId": { "type": "string", "format": "uuid" },
        "url": { "type": "string", "format": "uri" },
        "scheme": { "type": "string", "enum": ["ton","https"] }
      },
      "additionalProperties": false
    }
  ]
}
```

---

## 12. Референс‑стенд (что реализовать)

### 12.1. `protocol/`

* Схемы из §11.
* Генерация типов (Ajv + `ts-json-schema-generator`).
* TL‑B описания payload IP10 (для документации).

### 12.2. `sdk/`

* Класс `InstantPaySDK` из §9 (валидация, фолбэк, события).
* Deep‑link builder:

  * mobile → `ton://transfer/...`
  * desktop → `https://app.tonkeeper.com/transfer/...`
  * опциональный `bin` с `IP10Payload` (если включено в конфиг SDK).
* Нет лишнего UI: только пользовательский `onUnsupported`.

### 12.3. `wallet-mock/`

* Инжект API и панель:

  * Режимы: instant‑send / confirm‑send / user‑cancel / expired.
  * Строгое поведение `ACTIVE_OPERATION` после `click`.
  * `sent` возвращает фейковый base64 BOC.
* Логи событий.

### 12.4. `dapp-demo/`

* Радио‑выбор тарифов → каждый выбор — новый `invoiceId` и `setPayButton`.
* Кнопка‑фолбэк через `onUnsupported`.
* Потоки:

  * успешная отправка (instant),
  * подтверждение,
  * отмена,
  * истечение срока,
  * замена предложения (`replaced`).

---

## 13. Рекомендации по трекингу платежа

* **Inject‑путь:** начинайте трекинг **после** `sent(boc)`. Вычислите message‑hash и ждите появления в блоках/эксплорере.
* **Фолбэк:** начинайте трекинг **после** `handoff`. Коррелируйте по `(recipient, amount, asset, time‑window)`; если использовали `bin`/IP10‑payload — индексируйте по `invoiceId` внутри payload (когда кошелёк его применил).

---

## 14. Безопасность и приватность

* До оплаты никакой адрес пользователя не раскрывается.
* dApp не может влиять на поведение после клика.
* `adnlAddress` предназначен для off‑chain зашифрованной метадаты покупки (детали обмена ключами вне рамок 1.0).
* Рекомендуется логировать `invoiceId` и события для аудита.

---

## 15. Совместимость и версионирование

* `protocolVersion = "1.0.0"`.
* dApp может требовать минимум через `require.minProtocol` в `handshake`. Несовместимость → `INCOMPATIBLE_VERSION`.

---

## 16. Примеры последовательностей

### 16.1. Замена предложения до клика

```
setPayButton(A: invoiceId=ia)   -> рендер A
setPayButton(B: invoiceId=ib)   -> cancelled(ia,'replaced'), рендер B
click(ib)                        -> click(ib)
sent(ib,boc)                    -> sent(ib,boc)
```

### 16.2. Попытка изменения после клика

```
click(ia)                        -> click(ia)
setPayButton(B)                  -> ERROR ACTIVE_OPERATION
```

### 16.3. Фолбэк

```
setPayButton(A, onUnsupported)   -> onUnsupported({ url, open })
[пользователь нажал вашу кнопку] -> open()
                                   handoff(ia, url, scheme)
[далее dApp отслеживает сеть]
```

---

## 17. Check‑list готовности (MVP стенда)

* [ ] Инжект API с указанным контрактом.
* [ ] Handshake синхронный, события форвардятся.
* [ ] Строгие валидаторы (Ajv) по схемам.
* [ ] Правила замены/активной операции реализованы.
* [ ] `sent` отдаёт base64 BOC.
* [ ] Фолбэк с `handoff`, mobile/desktop схемы.
* [ ] Мок‑кошелёк с режимами и логами.
* [ ] Демонстрация сценариев в dApp‑демо.
----
