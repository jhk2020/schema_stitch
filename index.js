const { HttpLink } = require('apollo-link-http');
const fetch = require('node-fetch');
const { ApolloServer } = require('apollo-server');
const {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
  makeRemoteExecutableSchema,
  introspectSchema,
  transformSchema,
  RenameTypes,
} = require('graphql-tools');


const getRemoteSchema = async (uri) => {
  const link = new HttpLink({ uri, fetch });

  const schema = await introspectSchema(link);

  const executableSchema = makeRemoteExecutableSchema({
    schema,
    link,
  });

  return executableSchema
}

Promise.all([
  getRemoteSchema('https://cms.qz.com/graphql'),
  getRemoteSchema('http://api.githunt.com/graphql'),
])
  .then((schemas) => {
    const [cmsSchema, githuntSchema] = schemas;

    const transformedGithuntSchema = transformSchema(githuntSchema, [
      new RenameTypes((name) => `githunt_${name}`)
    ]);

    const finalSchema = mergeSchemas({
      schemas: [cmsSchema, transformedGithuntSchema]
    });

    const server = new ApolloServer({ schema: finalSchema });

    server.listen().then(({ url }) => console.log(`🚀  Server ready at ${url}`));
  });
