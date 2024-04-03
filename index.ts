import * as dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import {
  Connection,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import { LimitOrderProvider, ownerFilter } from "@jup-ag/limit-order-sdk";
import BN from "bn.js";

// Create Express instance
const app = express();
app.use(bodyParser.json());
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "";
const connection = new Connection(SOLANA_RPC_ENDPOINT);

const limitOrder = new LimitOrderProvider(connection);

// Define a route
app.post("/create-order", async (req: Request, res: Response) => {
  try {
    const { owner, inputTokenAddress, outputTokenAddress } = req.body;
    // Assuming limitOrder is imported from somewhere
    const { tx, orderPubKey } = await limitOrder.createOrder({
      owner: owner.publicKey,
      inAmount: new BN(100000),
      outAmount: new BN(100000),
      inputMint: new PublicKey(inputTokenAddress),
      outputMint: new PublicKey(outputTokenAddress),
      expiredAt: null,
      base: owner.publicKey,
    });
    await sendAndConfirmTransaction(connection, tx, [owner]);
    res.status(201).json({ orderPubKey });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error });
  }
});

app.post("/order-history", async (req, res) => {
  try {
    const { owner } = req.body;
    const orders = await limitOrder.getOrders([ownerFilter(owner.publicKey)]);
    const orderHistory = await limitOrder.getOrderHistory({
      wallet: owner.publicKey.toBase58(),
      take: 20, // optional, default is 20, maximum is 100
      // lastCursor: order.id // optional, for pagination
    });
    const orderHistoryCount = await limitOrder.getOrderHistoryCount({
      wallet: owner.publicKey.toBase58(),
    });
    const tradeHistory = await limitOrder.getTradeHistory({
      wallet: owner.publicKey.toBase58(),
      take: 20, // optional, default is 20, maximum is 100
      // lastCursor: order.id // optional, for pagination
    });
    const tradeHistoryCount = await limitOrder.getTradeHistoryCount({
      wallet: owner.publicKey.toBase58(),
    });
    res.json({
      orders,
      orderHistory,
      orderHistoryCount,
      tradeHistory,
      tradeHistoryCount,
    });
  } catch (error) {
    console.error("Error querying order history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/cancel-order", async (req, res) => {
  try {
    const { owner, orderPublicKey } = req.body;

    // Convert public key strings to PublicKey objects
    const orderPublicKeyObj = new PublicKey(orderPublicKey);

    // Cancel the order
    const txid = await limitOrder.cancelOrder({
      owner: owner.publicKey,
      orderPubKey: orderPublicKeyObj,
    });

    res.json({ txid });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
