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

    // add "githunt" prefix to Githunt Schema Types
    const transformedGithuntSchema = transformSchema(githuntSchema, [
      new RenameTypes((name) => `githunt_${name}`)
    ]);

    const typeExtension = `
        extend type Post {
            githunt_comments: [githunt_Entry]
        }
    `

    const resolverExtensions = {
        Post: {
            githunt_comments: {
                resolve(post, args, context, info) {
                    return info.mergeInfo.delegateToSchema({
                        schema: githuntSchema,
                        operation: 'query',
                        fieldName: 'feed',
                        args: {
                            type: 'NEW',
                            limit: 5,
                        },
                        context,
                        info,
                    });
                }
            }
        }
    }

    const finalSchema = mergeSchemas({
      schemas: [
          cmsSchema, 
          transformedGithuntSchema,
          typeExtension,
      ],
      resolvers: resolverExtensions,
    });

    const server = new ApolloServer({ schema: finalSchema });

    server.listen().then(({ url }) => console.log(`🚀  Server ready at ${url}`));
  });
