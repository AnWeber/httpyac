import * as plugins from './plugins';
import { pluginStore } from './store';

pluginStore.core = plugins.registerPlugins;
pluginStore.eventSource = plugins.registerEventSourcePlugin;
pluginStore.grpc = plugins.registerGrpcPlugin;
pluginStore.mqtt = plugins.registerMqttPlugin;
pluginStore.oauth2 = plugins.registerOAuth2Plugin;
pluginStore.websocket = plugins.registerWebsocketPlugin;
