import { beginCell} from "@ton/core";
import { randomBytes } from "crypto";

const uuid = randomBytes(16);

const noneAdnl = beginCell().storeUint(0, 8); // Placeholder for ADNL address
const exampleAdnlBuffer = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex")
const tonsiteAdnl = beginCell()
    .storeUint(1, 8)
    .storeBuffer(exampleAdnlBuffer); // Placeholder for ADNL address

const invoicePayload = beginCell()
    .storeUint(0x7aa23eb5, 32) // INVOICE_OP_CODE (operation identifier)
    .storeBuffer(uuid)
    .storeBuilder(noneAdnl)
    .endCell();

const invoiceTonPayload = invoicePayload;

// const invoiceJettonPayload = beginCell()
//     .storeUint(0xf8a7ea5, 32) // JETTON_TRANSFER_OP_CODE (operation identifier)
//     .storeUint(0, 64) // Query ID (0 for new transactions)
//     .storeCoins(jettonAmount) // Amount to transfer (1 USDt)
//     .storeAddress(destination) // Recipient address
//     .storeAddress(wallet.address) // Address to receive excess funds (usually address of sender)
//     .storeBit(false) // No custom payload
//     .storeCoins(1n) // Forward fee in nanoTON (for send notify to wallet)
//     .storeMaybeRef(invoicePayload) // Forward payload
//     .endCell();

console.log("invoicePayload", invoicePayload.toBoc().toString("base64"));
// console.log("invoiceTonPayload", invoiceTonPayload.toBoc().toString("base64"));