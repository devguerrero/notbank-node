import { NotbankError } from "../../models";
import { Pinger } from "./pinger";
import { Reauther } from "./reauther";
import { Resubscriber } from "./resubscriber";
import { WebsocketConnection } from "./websocketConnection";
import { WebsocketConnectionConfiguration } from "./websocketConnectionConfiguration";

export class Restarter {
  private reconnecting: boolean
  private connection?: WebsocketConnection
  private connectionConfiguration: WebsocketConnectionConfiguration
  private pinger: Pinger
  private resubscriber: Resubscriber
  private reauther: Reauther
  private closeRequested: boolean;

  constructor(params: { connectionConfiguration: WebsocketConnectionConfiguration }) {
    this.closeRequested = false
    this.reconnecting = false
    this.connectionConfiguration = params.connectionConfiguration
    this.pinger = new Pinger()
    this.resubscriber = new Resubscriber()
    this.reauther = new Reauther()
    this.connection = null
  }

  getResubscriber(): Resubscriber {
    return this.resubscriber
  }

  getReauther(): Reauther {
    return this.reauther
  }

  getConnection(): WebsocketConnection {
    if (this.reconnecting) {
      throw new NotbankError("unable to make notbank request. websocket reconnecting", -1)
    }
    return this.connection
  }

  async reconnect(): Promise<void> {
    if (this.reconnecting || this.closeRequested) { return }
    this.reconnecting = true
    this.closeCurrentConnection()
    this.connection = this.#newConnection()
    await this.#connect();
    this.reauther.makeAuthentication(this.connection)
    this.resubscriber.makeSubscriptions(this.connection)
    this.pinger.startPing(this.connection, this)
    this.reconnecting = false
  }

  async #connect() {
    while (!this.closeRequested) {
      try {
        await Promise.race([
          this.connection.connect(),
          new Promise((resolve, reject) => setTimeout(reject, 10_000))
        ]);
        return
      } catch (e) {
        // try again
      }
    }
  }

  #newConnection(): WebsocketConnection {
    return new WebsocketConnection({
      domain: this.connectionConfiguration.domain,
      peekMessageIn: this.connectionConfiguration.peekMessageIn,
      peekMessageOut: this.connectionConfiguration.peekMessageOut,
      websocketHooks: {
        onMessage: this.connectionConfiguration.websocketHooks?.onMessage,
        onOpen: this.connectionConfiguration.websocketHooks?.onOpen,
        onError: (event) => {
          if (this.reconnecting) { return }
          this.connectionConfiguration.websocketHooks?.onError?.(event)
        },
        onClose: (event) => {
          if (this.reconnecting || !this.closeRequested) { return }
          this.connectionConfiguration.websocketHooks?.onClose?.(event)
        },
      }
    })
  }

  closeCurrentConnection(): Promise<void> {
    this.pinger.stop()
    var closed = this.connection?.close()
    return closed
  }

  close(): Promise<void> {
    this.closeRequested = true
    var closed = this.closeCurrentConnection()
    return closed;
  }
}