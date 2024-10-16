import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';


async function bootstrap() {

  const logger = new Logger('OrdersMicroservice-Main');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
     options: {
    //   host: envs.HOST,
       port: envs.PORT,
     },
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  await app.listen();
  logger.log('Orders microservice running on port ' + envs.PORT);
}
bootstrap();