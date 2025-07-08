# Swagger To Postman Collections (CLI)

> Made on top of [swagger2-to-postman](https://github.com/postmanlabs/swagger2-to-postman)

## Helps convert swagger page api content to a postman json collection using the command line

### Usage

```bash

yarn start -i <swagger-url> -o <output-file>

#or

tsx lib/index.ts -i <swagger-url> -o <output-file>
```
### Example

```bash

#add ?format=json to the url to get the swagger json:

ts-node lib/index.ts -i https://petstore.swagger.io/v2?format=json -o petstore.json


```

```bash
#For localhost use http://localhost:3000/swagger.json

#or api-json at end of url 
ts-node lib/index.ts -i http://localhost:3000/api-json -o localhost-collection.json

```

### Options

- `-i, --input <swagger-url>`
- `-o, --output <output-file>`

