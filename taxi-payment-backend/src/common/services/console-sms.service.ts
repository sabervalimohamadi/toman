import { Injectable } from '@nestjs/common';
import { SmsService } from './sms.service';

@Injectable()
export class ConsoleSmsService extends SmsService {
  async send(phone: string, message: string): Promise<void> {
    console.log(`[SMS] To: ${phone} | ${message}`);
  }
}
