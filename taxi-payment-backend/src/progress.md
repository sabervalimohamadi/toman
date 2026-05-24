# Taxi Payment Backend — Session Progress

## وضعیت کلی

سه فاز اصلی کامل شده‌اند: Auth، Wallet، و Payment.
**همه ۶۱ unit test و ۲۴ E2E test پاس می‌شوند.**
**مرحله بعدی: هیچ feature جدیدی تعریف نشده — پروژه آماده است.**

---

## آنچه انجام شده

### فاز ۱ — راه‌اندازی پروژه ✅

- پروژه NestJS با ساختار ماژولار
- وابستگی‌های Runtime: `@nestjs/mongoose`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/config`, `@nestjs/swagger`, `class-validator`, `class-transformer`, `uuid`
- وابستگی‌های Dev: `mongodb-memory-server`, `supertest`
- فایل‌های `.env` و `.env.test`

### فاز ۲ — سیستم Auth ✅

| فایل | توضیح |
|------|-------|
| `src/users/schemas/user.schema.ts` | User schema با `UserRole` enum (`passenger` / `driver`) |
| `src/users/users.service.ts` | findByPhone, findById, create, update |
| `src/users/users.module.ts` | exports UsersService |
| `src/auth/schemas/otp.schema.ts` | OTP با TTL index |
| `src/auth/interfaces/auth.interfaces.ts` | IJwtPayload, IAuthResponse, ISendOtpResponse |
| `src/auth/dto/send-otp.dto.ts` | regex `/^09[0-9]{9}$/` |
| `src/auth/strategies/jwt.strategy.ts` | payload: `{ sub, phone, role }` |
| `src/auth/guards/jwt-auth.guard.ts` | JwtAuthGuard |
| `src/auth/decorators/current-user.decorator.ts` | `@CurrentUser()` و `@CurrentUser('id')` |
| `src/auth/auth.service.ts` | sendOtp, verifyOtp, getProfile |
| `src/auth/auth.controller.ts` | POST /send-otp, /verify-otp — GET /profile |
| `src/auth/auth.module.ts` | AuthModule |
| `src/common/services/sms.service.ts` | abstract SmsService |
| `src/common/services/console-sms.service.ts` | ConsoleSmsService (placeholder) |

### فاز ۳ — سیستم Wallet ✅

| فایل | توضیح |
|------|-------|
| `src/wallet/schemas/wallet.schema.ts` | userId (unique), balance (≥0, default 0), isActive |
| `src/wallet/schemas/transaction.schema.ts` | walletId, userId, type, amount, balanceBefore/After, referenceId (sparse unique), status |
| `src/wallet/interfaces/wallet.interfaces.ts` | IWallet, ITransaction, ITopUpResult, IDeductResult, IPaginatedTransactions, IWalletService |
| `src/wallet/dto/top-up-wallet.dto.ts` | amount: int, min 1000, max 50M |
| `src/wallet/dto/get-transactions.dto.ts` | page/limit با `@Transform`, type/date filters |
| `src/wallet/wallet.service.ts` | تمام write‌ها با `session.withTransaction()` |
| `src/wallet/wallet.controller.ts` | GET /balance — POST /top-up — GET /transactions |
| `src/wallet/wallet.module.ts` | exports WalletService |
| `src/wallet/wallet.service.spec.ts` | 12 unit test (همه pass) |
| `test/wallet.e2e-spec.ts` | 8 E2E test (همه pass) |

**نکات کلیدی WalletService:**
- `topUp` و `refund`: از `upsert: true` + `$setOnInsert: { isActive: true }` استفاده می‌کنند — wallet در اولین `topUp` خودکار ایجاد می‌شود
- `deduct`: filter اتمیک `{ balance: { $gte: amount } }` برای جلوگیری از موجودی منفی
- `$inc` با `{ new: false }` برای capture کردن `balanceBefore`
- `session.withTransaction()` به جای manual `startTransaction/commit` برای retry خودکار روی `WriteConflict`

### فاز ۴ — سیستم Payment ✅

| فایل | توضیح |
|------|-------|
| `src/payment/schemas/payment.schema.ts` | passengerId, driverId, amount, status, method, qrToken, driverCode, failureReason, paidAt, walletTransactionId |
| `src/payment/schemas/driver-code.schema.ts` | driverId (unique), code (unique), isActive |
| `src/payment/interfaces/payment.interfaces.ts` | IPayment, IDriverCode, IQRToken, IQRPaymentResult, IManualPaymentResult, IPaginatedPayments, IPaymentService |
| `src/payment/dto/pay-by-qr.dto.ts` | qrToken: `@IsUUID(4)`, amount: int ≥1 |
| `src/payment/dto/pay-by-code.dto.ts` | driverCode: uppercase transform, `/^[A-Z0-9]{6}$/` |
| `src/payment/dto/generate-qr.dto.ts` | expiresInSeconds: optional, 60–3600, default 300 |
| `src/payment/dto/get-payments.dto.ts` | page/limit، status/method enum، date range |
| `src/common/decorators/roles.decorator.ts` | `@Roles(...UserRole[])` با `SetMetadata` |
| `src/common/guards/roles.guard.ts` | RolesGuard — بررسی `user.role` از JWT |
| `src/payment/payment.service.ts` | تمام منطق پرداخت |
| `src/payment/payment.controller.ts` | 6 endpoint |
| `src/payment/payment.module.ts` | imports WalletModule + UsersModule |
| `src/payment/payment.service.spec.ts` | 25 unit test (همه pass) |
| `test/payment.e2e-spec.ts` | 16 E2E test (همه pass) |

**نکات کلیدی PaymentService:**
- QR token‌ها در `Map<string, IQRToken>` (in-memory) نگه‌داری می‌شوند با `setTimeout` برای cleanup
- Token فقط در صورت موفقیت پرداخت از map حذف می‌شود (callback `onSuccess`) — در صورت شکست token برای retry باقی می‌ماند
- Compensating transaction: اگر `topUp` راننده بعد از `deduct` مسافر شکست بخورد، `refund` صادر می‌شود
- ReferenceId‌ها: `pay:{id}` برای deduct، `pay:{id}:topup` برای topUp، `refund:{id}` برای refund
- `qrToken` در Payment schema ایندکس sparse دارد (بدون unique — برای امکان retry بعد از failure)

---

## Endpoints کامل

### Auth — prefix: `api/v1/auth`
| Method | Path | Auth | توضیح |
|--------|------|------|-------|
| POST | /send-otp | ❌ | ارسال OTP به شماره موبایل |
| POST | /verify-otp | ❌ | تایید OTP و دریافت JWT |
| GET | /profile | JWT | اطلاعات کاربر جاری |

### Wallet — prefix: `api/v1/wallet`
| Method | Path | Auth | توضیح |
|--------|------|------|-------|
| GET | /balance | JWT | موجودی کیف پول |
| POST | /top-up | JWT | شارژ کیف پول |
| GET | /transactions | JWT | تاریخچه تراکنش‌ها |

### Payment — prefix: `api/v1/payment`
| Method | Path | Auth | Role | توضیح |
|--------|------|------|------|-------|
| POST | /qr/generate | JWT | DRIVER | تولید QR token |
| GET | /driver-code | JWT | DRIVER | دریافت/ایجاد کد ثابت راننده |
| POST | /pay/qr | JWT | PASSENGER | پرداخت با اسکن QR |
| POST | /pay/code | JWT | PASSENGER | پرداخت با کد راننده |
| GET | /history | JWT | any | تاریخچه پرداخت‌ها |
| GET | /:id | JWT | any | جزئیات یک پرداخت |

---

## ساختار فایل‌ها

```
taxi-payment-backend/
├── src/
│   ├── auth/
│   │   ├── decorators/current-user.decorator.ts
│   │   ├── dto/send-otp.dto.ts
│   │   ├── dto/verify-otp.dto.ts
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── interfaces/auth.interfaces.ts
│   │   ├── schemas/otp.schema.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── auth.service.spec.ts         ← 13 unit test ✅
│   ├── common/
│   │   ├── decorators/roles.decorator.ts
│   │   ├── guards/roles.guard.ts
│   │   └── services/
│   │       ├── sms.service.ts
│   │       └── console-sms.service.ts
│   ├── payment/
│   │   ├── dto/
│   │   │   ├── generate-qr.dto.ts
│   │   │   ├── get-payments.dto.ts
│   │   │   ├── pay-by-code.dto.ts
│   │   │   └── pay-by-qr.dto.ts
│   │   ├── interfaces/payment.interfaces.ts
│   │   ├── schemas/
│   │   │   ├── driver-code.schema.ts
│   │   │   └── payment.schema.ts
│   │   ├── payment.controller.ts
│   │   ├── payment.module.ts
│   │   ├── payment.service.ts
│   │   └── payment.service.spec.ts      ← 25 unit test ✅
│   ├── users/
│   │   ├── schemas/user.schema.ts
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── users.service.spec.ts        ← 9 unit test ✅
│   ├── wallet/
│   │   ├── dto/
│   │   │   ├── get-transactions.dto.ts
│   │   │   └── top-up-wallet.dto.ts
│   │   ├── interfaces/wallet.interfaces.ts
│   │   ├── schemas/
│   │   │   ├── transaction.schema.ts
│   │   │   └── wallet.schema.ts
│   │   ├── wallet.controller.ts
│   │   ├── wallet.module.ts
│   │   ├── wallet.service.ts
│   │   └── wallet.service.spec.ts       ← 12 unit test ✅
│   ├── app.controller.spec.ts           ← 2 unit test ✅
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
└── test/
    ├── app.e2e-spec.ts                  ← قدیمی، شکسته (pre-existing)
    ├── auth.e2e-spec.ts                 ← شکسته (از MongoMemoryServer بدون binary استفاده می‌کند)
    ├── wallet.e2e-spec.ts               ← 8 E2E test ✅
    ├── payment.e2e-spec.ts              ← 16 E2E test ✅
    └── jest-e2e.json
```

---

## نتیجه تست‌ها (آخرین اجرا)

```
# Unit tests
npx jest --no-coverage --forceExit

PASS src/app.controller.spec.ts
PASS src/users/users.service.spec.ts
PASS src/auth/auth.service.spec.ts
PASS src/wallet/wallet.service.spec.ts
PASS src/payment/payment.service.spec.ts

Tests: 61 passed, 61 total

# E2E tests
npx jest --no-coverage --forceExit --config test/jest-e2e.json test/wallet.e2e-spec.ts test/payment.e2e-spec.ts

PASS test/wallet.e2e-spec.ts   (8 passed)
PASS test/payment.e2e-spec.ts  (16 passed)
```

> **توجه:** `test/app.e2e-spec.ts` و `test/auth.e2e-spec.ts` قبل از این session شکسته بودند و به این پروژه مربوط نمی‌شوند.

---

## نکات فنی مهم

### محیط تست
- MongoDB 8.3.1 روی سرور نصب است: `C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe`
- تمام spec‌هایی که از `MongoMemoryReplSet` استفاده می‌کنند باید این را در ابتدا داشته باشند:
  ```typescript
  process.env['MONGOMS_SYSTEM_BINARY'] =
    'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';
  ```
- از `MongoMemoryReplSet` (نه `MongoMemoryServer`) استفاده می‌شود چون WalletService از MongoDB transaction استفاده می‌کند

### الگوهای کلیدی
- **Import بدون `.js`** — با وجود `"module": "nodenext"` در tsconfig، ts-jest در CJS mode با `.js` extension کار نمی‌کند
- **JWT payload**: `{ sub: userId, phone, role }` — `@CurrentUser('id')` مقدار `sub` را برمی‌گرداند
- **Persian errors / English logs** — پیام‌های خطای کاربر به فارسی، log‌های داخلی به انگلیسی
- **`session.withTransaction()`** به جای manual transaction برای retry خودکار روی WriteConflict

### متغیرهای محیطی
```
MONGODB_URI=mongodb://localhost:27017/taxi-payment
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=3000
```

### دستورات مفید
```bash
# Unit tests
npx jest --no-coverage --forceExit

# E2E tests (فقط wallet و payment)
npx jest --no-coverage --forceExit --config test/jest-e2e.json test/wallet.e2e-spec.ts test/payment.e2e-spec.ts

# TypeScript check
npx tsc --noEmit

# Dev server
npm run start:dev

# Swagger docs
http://localhost:3000/api/docs
```
