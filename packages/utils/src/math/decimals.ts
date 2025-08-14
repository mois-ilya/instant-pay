/**
 * The original function can be found at the following link:
 * https://github.com/tonkeeper/ton-console/blob/2e0218c2ba6b7fdd220687c80dd264d63513d502/src/shared/lib/decimals.ts#L8
 *
 * Unlike `toNano`, this function is designed to convert numeric values with arbitrary precision
 */
export function fromDecimals(src: string | bigint, decimals: number | string): bigint {
    const decimalsNum = typeof decimals === 'string' ? Number(decimals) : decimals;

    if (!Number.isInteger(decimalsNum) || decimalsNum < 0 || decimalsNum > 255) {
        throw new Error('Invalid decimals value. It must be an integer between 0 and 255.');
    }

    const bigIntDecimals = 10n ** BigInt(decimals);

    if (typeof src === 'bigint') {
        return src * bigIntDecimals;
    } else {
        // It's too hard to reliably support numbers without losing precision when the precision can be up to 255. Use strings
        // if (typeof src === 'number') {

        if (src === '') {
            throw Error('Invalid number');
        }

        // Check sign
        let neg = false;
        while (src.startsWith('-')) {
            neg = !neg;
            src = src.slice(1);
        }

        // Split string
        if (src === '.') {
            throw Error('Invalid number');
        }
        const parts = src.split('.');
        if (parts.length > 2) {
            throw Error('Invalid number');
        }

        // Prepare parts
        let whole = parts[0] as string | undefined;
        let frac = parts[1] as string | undefined;
        if (!whole) {
            whole = '0';
        }

        if (frac && frac.length > decimalsNum) {
            throw Error('Invalid number');
        }

        if (!frac) {
            frac = '0';
        }

        while (frac.length < decimalsNum) {
            frac += '0';
        }

        // Convert
        let r = BigInt(whole) * bigIntDecimals + BigInt(frac);
        if (neg) {
            r = -r;
        }
        return r;
    }
}

export function toDecimals(num: bigint | number | string, decimals: number | string): string {
    const dec = Number(decimals);
    const strNum = BigInt(num)
        .toString()
        .padStart(dec + 1, '0');

    const intPart = strNum.slice(0, -dec);
    const fracPart = strNum.slice(-dec).replace(/0+$/, '');

    return [intPart, fracPart].filter(Boolean).join('.');
}