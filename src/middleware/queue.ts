import amqp from 'amqplib/callback_api';
import {Channel, Connection, ConsumeMessage} from 'amqplib';

export class VideoEncodingQueue {
  connection: Connection;
  channel: Channel;
  queue: string = 'video_encoding';

  constructor() {
    this.tryConnection();
  }

  tryConnection() {
    amqp.connect('amqp://localhost', (e, conn: Connection) => {
      if (e) {
        setTimeout(() => this.tryConnection(), 50);
      } else {
        this.connection = conn;

        // @ts-ignore
        conn.createChannel((err: Error, channel: Channel) => {
          this.channel = channel;
          this.channel.assertQueue(this.queue, {durable: true});
        });
      }
    });
  }

  addToQueue(fileId: string, fileMP4Path: string) {
    if (this.connection && this.channel) {
      const msg = {fileId, fileMP4Path};
      this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(msg)), {persistent: true});
    } else {
      throw Error('No connection to RabbitMQ !');
    }
  }

  readFromQueue(func: Function) {
    if (this.connection && this.channel) {
      this.channel.consume(this.queue, (data: ConsumeMessage) => func(data.content.toJSON()), {noAck: true});
    } else {
      throw Error('No connection to RabbitMQ !');
    }
  }
}
