export abstract class SmsService {
  abstract send(phone: string, message: string): Promise<void>;
}
