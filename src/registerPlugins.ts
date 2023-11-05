import * as plugins from './plugins';
import { pluginStore } from './store';

pluginStore.core = plugins.registerCorePlugins;
pluginStore.dotenv = plugins.registerDotenvPlugin;
pluginStore.eventSource = plugins.registerEventSourcePlugin;
pluginStore.graphql = plugins.registerGraphQL;
pluginStore.grpc = plugins.registerGrpcPlugin;
pluginStore.http = plugins.registerHttpPlugin;
pluginStore.intellij = plugins.registerIntellijPlugin;
pluginStore.injection = plugins.registerInjectionPlugin;
pluginStore.javascript = plugins.registerJavascriptPlugin;
pluginStore.mqtt = plugins.registerMqttPlugin;
pluginStore.oauth2 = plugins.registerOAuth2Plugin;
pluginStore.rabbitMQ = plugins.registerAmqpPlugin;
pluginStore.assert = plugins.registerAssertPlugin;
pluginStore.websocket = plugins.registerWebsocketPlugin;
pluginStore.xml = plugins.registerXmlPuglin;
