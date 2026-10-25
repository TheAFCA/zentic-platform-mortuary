# Garage para Homena

Stack independiente `homena-storage` con Garage v2.5.0 y volúmenes persistentes para datos y metadatos. No modifica los servicios actuales ni conecta todavía Homena.

La configuración TOML está incluida en el Compose con `configs.content`, evitando rutas relativas al checkout de Portainer. Requiere Docker Standalone y Compose 2.23.1 o posterior. No es para Swarm.

## Portainer

1. Publicar la rama en el repositorio accesible desde Portainer.
2. Crear un Stack nuevo `homena-storage` mediante **Repository**.
3. Seleccionar `refs/heads/feature/garage` y `deploy/garage/docker-compose.yml`.
4. Generar un secreto con `openssl rand -hex 32` y cargarlo como variable `GARAGE_RPC_SECRET` del Stack. No subirlo a Git.
5. Desplegar solo este Stack.

Garage utiliza una red propia. S3 se publica únicamente en `127.0.0.1:3900` del servidor, sin acceso desde Internet. RPC queda en el loopback del contenedor. No se habilitan endpoints web ni de administración. La conexión con Homena y HTTPS quedan para la integración posterior.

## Compose desde un checkout

Desde la raíz del repositorio:

```bash
cd deploy/garage
cp .env.example .env
# Editar .env con el secreto generado.
docker compose config --quiet
docker compose up -d
```

`.env` ya está excluido por el `.gitignore` existente.

## Inicialización única

Localizar el nombre del contenedor:

```bash
docker ps --filter label=com.docker.compose.project=homena-storage
```

Sustituir `<contenedor>` por ese nombre y `<node_id>` por el identificador devuelto por status:

```bash
docker exec <contenedor> /garage status
docker exec <contenedor> /garage layout assign -z local -c 20G <node_id>
docker exec <contenedor> /garage layout apply --version 1
docker exec <contenedor> /garage bucket create homena-imagenes
docker exec <contenedor> /garage key create homena-api
docker exec <contenedor> /garage bucket allow --read --write --key homena-api homena-imagenes
docker exec <contenedor> /garage bucket info homena-imagenes
```

Inicializar solo una instalación nueva. Los volúmenes conservan layout, claves y buckets entre recreaciones. La creación de clave muestra credenciales; guardarlas fuera de Git y de logs de CI. Todavía no agregarlas a la API.

`20G` es capacidad declarada del layout, no una cuota ni reserva de disco. Garage ignora esa capacidad con un solo nodo. Este Compose no limita el almacenamiento a 20 GB: los volúmenes usan el disco compartido del servidor. `replication_factor = 1` corresponde a un solo nodo y no ofrece redundancia; no cambiarlo como un ajuste rutinario sobre datos existentes.

## Verificación

```bash
docker exec <contenedor> /garage status
docker logs --tail 50 <contenedor>
```

El healthcheck comprueba respuesta del proceso; no verifica el bucket ni las subidas S3. Con un cliente S3 ya instalado en el host, configurar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` con la clave creada sin escribir los valores en el historial, y probar:

```bash
aws --endpoint-url http://127.0.0.1:3900 --region garage s3 ls s3://homena-imagenes/
printf 'homena-garage-check' > /tmp/homena-garage-check.txt
aws --endpoint-url http://127.0.0.1:3900 --region garage s3 cp /tmp/homena-garage-check.txt s3://homena-imagenes/verification/check.txt
aws --endpoint-url http://127.0.0.1:3900 --region garage s3 cp s3://homena-imagenes/verification/check.txt /tmp/homena-garage-check-downloaded.txt
cmp /tmp/homena-garage-check.txt /tmp/homena-garage-check-downloaded.txt
aws --endpoint-url http://127.0.0.1:3900 --region garage s3 rm s3://homena-imagenes/verification/check.txt
```

La prueba crea y elimina únicamente `verification/check.txt`. No ejecutar `docker compose down -v`: elimina los volúmenes de este Stack.

## Referencias

- [Garage: instalación](https://garagehq.deuxfleurs.fr/documentation/quick-start/)
- [Garage: configuración](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/)
- [Compose: configs](https://docs.docker.com/reference/compose-file/configs/)

## Conexión de Homena después del merge y publicación de imágenes

Variables del Stack de API:

| Variable             | Valor                                           |
| -------------------- | ----------------------------------------------- |
| STORAGE_PROVIDER     | s3                                              |
| S3_ENDPOINT          | http://garage:3900                              |
| S3_REGION            | garage                                          |
| S3_BUCKET            | homena-imagenes                                 |
| S3_ACCESS_KEY_ID     | Clave homena-api creada en Garage               |
| S3_SECRET_ACCESS_KEY | Secreto de esa clave                            |
| STORAGE_PUBLIC_URL   | https://DOMINIO-REAL-DE-HOMENA/api/files/images |

Las claves S3 son diferentes de GARAGE_RPC_SECRET. No subir valores reales a Git.
La URL que se guarda en PostgreSQL utiliza el HTTPS de Homena. Garage sigue privado.

Conservar las redes actuales de la API y añadir la red existente de Garage:

```yaml
networks:
  garage_storage:
    external: true
    name: homena-storage_default
```

Agregar garage_storage a networks del servicio api sin retirar sus redes actuales.
Confirmar antes el nombre real de la red en Portainer. El alias garage debe resolver
allí. Esta modificación se hace al desplegar la integración, no al instalar Garage.

La web también necesita la imagen construida con el nginx.conf de esta rama:
/api/ tiene prioridad sobre archivos estáticos y el máximo de cuerpo es 6 MiB
para admitir una foto de 5 MiB más multipart. Si Nginx Proxy Manager impone un
límite menor, configurar client_max_body_size 6m en el proxy de Homena.

Las imágenes mantienen el carácter público de /uploads mediante identificadores
aleatorios. La API lee el bucket privado con sus credenciales. No colocar PDF
privados en carpetas de imágenes: conservan su almacenamiento y rutas autenticadas.
Las invitaciones y los PDF leen fotos S3 mediante FilesService sin descargar URLs
externas arbitrarias. Las URLs locales previas siguen soportadas si sus archivos
existen; no se recuperan archivos perdidos en despliegues anteriores.

Límites compartidos: fotos 5 MiB, logos 2 MiB, favicon 512 KiB. Las fotos se
convierten a WebP de 800 × 800; se rechaza el resultado si sigue superando
1.000.000 bytes después de reducir la calidad.

Los Dockerfiles fijan pnpm 10.34.5 para evitar el fallo de los overrides del
lockfile con versiones incompatibles instaladas mediante pnpm sin versión fija.

### Prueba real optativa

El test modules/files/garage.integration.spec.ts usa un servidor HTTP de prueba de
Nest y Garage real. No toca PostgreSQL ni reemplaza servicios. Requiere las variables
GARAGE_INTEGRATION_ENDPOINT, GARAGE_INTEGRATION_BUCKET,
GARAGE_INTEGRATION_ACCESS_KEY y GARAGE_INTEGRATION_SECRET_KEY fuera del historial.

```bash
pnpm --filter @zentic/shared-types build
pnpm --filter @zentic/api exec jest --runInBand modules/files/garage.integration.spec.ts
```

Desde el PC se puede usar un túnel SSH temporal hacia 127.0.0.1:3900 del servidor.
El test crea y elimina solo imágenes aleatorias en deceased/integration-test/.
Comprueba subida HTTP, optimización, lectura S3, visualización HTTP y límites.
El dominio homena.test es una URL de prueba; el test usa HTTP local y no valida
certificados TLS ni el proxy de producción.
