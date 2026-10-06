import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  (BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function toJSON() {
    return this.toString();
  };
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
