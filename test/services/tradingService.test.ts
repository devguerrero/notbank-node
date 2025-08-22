import assert from "assert";
import "mocha";

import { OrderSide } from "../../lib/models/enums/orderSide";
import { OrderTypeInt } from "../../lib/models/enums/orderType";
import { TimeInForce } from "../../lib/models/enums/timeInForce";
import { NotbankClient } from "../../lib/services/notbankClient";

describe("http trading service", () => {
  const client = NotbankClient.Factory.createRestClient("stgapi.notbank.exchange")


  before(async () => {
    // Autenticación previa a todas las pruebas en este bloque, http only
    await client.authenticateUser({
      ApiPublicKey: "ca1817fd1f2ec412ef3ab8086d5da0d3",
      ApiSecretKey: "da365b63efebc9deda12ce854dc4846abb71d772e644b3812116dd016e9070e2",
      UserId: "64",
    });
  });

  const tradingService = client.getTradingService();

  describe("sendOrder", () => {
    it("should send a valid order successfully", async () => {
      const mockOrderRequest = {
        InstrumentId: 1,
        AccountId: 99,
        TimeInForce: TimeInForce.GTC, // Usamos enum en lugar de string
        Side: OrderSide.Buy, // Usamos enum en lugar de número
        OrderType: OrderTypeInt.Limit, // Usamos enum en lugar de string
        Quantity: 10,
        LimitPrice: 80,
      };

      const response = await tradingService.sendOrder(mockOrderRequest);
      console.log(response)
      assert.ok(response.OrderId, "Response should include an OrderId");
      assert.strictEqual(
        response.Status,
        "SUCCESS",
        "Response status should be 'SUCCESS'",
      );
    });

    it("should throw an error for missing required parameters", async () => {
      try {
        const invalidOrderRequest = {
          Quantity: 10,
          Side: OrderSide.Buy, // Enum requerido
          TimeInForce: TimeInForce.GTC, // Enum requerido
          OrderType: OrderTypeInt.Market, // Enum requerido
        };

        // @ts-expect-error – Omitimos instrumentId y accountId
        await tradingService.sendOrder(invalidOrderRequest);
        assert.fail("The call should throw an error due to missing parameters");
      } catch (error: any) {
        assert.ok(error, "Error should be thrown");
        assert.match(
          error.message,
          /InstrumentId and AccountId are required/,
          "Error message should indicate missing fields",
        );
      }
    });
  });

  describe("getOrderBook", () => {
    it("should throw an error for missing required parameters", async () => {
      var orderbook = await tradingService.getOrderBook({ Market_Pair: "BTCUSDT", Depth: 5, Level: 2 })
      assert.ok(orderbook)
      assert.equal(orderbook.asks.length, 5)
      assert.equal(orderbook.bids.length, 5)
    });
  });
});