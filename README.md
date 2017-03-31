# 3D Morph 



### Install/Setup
`yarn` or `npm install`

`yarn build` or `npm run build`

### Dev
`yarn dev` or `npm run dev`





### Release to S3
Create a file `aws.private.json` containing you AWS credentials. For example:

`{
"accessKeyId": "ABCDEFGHIJKL",
"secretAccessKey": "abcd12345efghjkl"
}`

Prompts to bump version number and select a bucket to push to.
`yarn release` or `npm run release` 

### Demos
https://mikatalk.github.io/3d-morph/

https://mikatalk.github.io/3d-morph/giraffe/

https://mikatalk.github.io/3d-morph/key-peele
