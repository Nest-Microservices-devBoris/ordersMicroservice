# orders-microservice

## Dev

1. Clonar el repositorio
2. Instalar dependencias
3. Crear el archivo `.env` basado en el `.env.template`
4. Levantar la base de datos con `docker-compose up -d`
5. Levantar el servidor de NATS
```bash
docker run -d --name nats-server -p 4222:4222 -p 8223:8222 nats
```
6. Tener corriendo los servicios que se van a consumir
7. Ejecutar el comando `npm run start:dev`

