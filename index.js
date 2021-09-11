/* eslint-disable @typescript-eslint/no-var-requires */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = 'C:/Users/weber/Desktop/httpyac/httpyac.github.io/examples/request/grpc/grpc.proto';

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);

const HelloService = grpc.loadPackageDefinition(packageDefinition).hello.HelloService;

const client = new HelloService(
  'grpcb.in:9000',
  grpc.credentials.createInsecure()
);

client.sayHello({ greeting: 'asdf' }, (...args) => {
  console.log(args);
});
