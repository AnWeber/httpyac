import * as plugins from './plugins';
import { pluginStore } from './store';

pluginStore.core = plugins.registerPlugins;
pluginStore.mqtt = plugins.registerMqttPlugin;
