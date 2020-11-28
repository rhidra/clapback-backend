import amqp from 'amqplib/callback_api';
import {Channel, Connection, ConsumeMessage} from 'amqplib';

const mqUser = process.env.RABBITMQ_DEFAULT_USER;
const mqPassword = process.env.RABBITMQ_DEFAULT_PASS;
const mqURI = process.env.NODE_ENV === 'development' ? 'amqp://localhost' : `amqp://${mqUser}:${mqPassword}@rabbitmq`;

export class VideoEncodingQueue {
  connection: Connection;
  channel: Channel;
  queueIn: string = 'video_encoding_in';
  queueOut: string = 'video_encoding_out';

  registeredFunc: any = null;

  constructor() {
    this.tryConnection();
  }

  async tryConnection() {
    amqp.connect(mqURI, async (e, conn: Connection) => {
      if (e) {
        setTimeout(() => this.tryConnection(), 50);
      } else {
        this.connection = conn;

        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.queueIn, {durable: true});
        await this.channel.assertQueue(this.queueOut, {durable: true});
        if (this.registeredFunc) {
          this.registerOut(this.registeredFunc);
        }
      }
    });
  }

  addToQueue(fileId: string, fileMP4Path: string) {
    if (this.connection && this.channel) {
      const msg = {fileId, fileMP4Path};
      this.channel.sendToQueue(this.queueIn, Buffer.from(JSON.stringify(msg)), {persistent: true});
    } else {
      throw Error('No connection to RabbitMQ !');
    }
  }

  registerOut(func: Function) {
    if (this.connection && this.channel) {
      this.channel.consume(this.queueOut,
        (msg: ConsumeMessage) => func(JSON.parse(msg.content.toString()))
          .then(() => this.channel.ack(msg))
          .catch(() => this.channel.nack(msg)),
        {noAck: false});
    } else {
      this.registeredFunc = func;
    }
  }

  onShutdown() {
    this.channel.close();
    this.connection.close();
  }
}
