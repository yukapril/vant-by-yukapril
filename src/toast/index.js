import Vue from 'vue';
import VueToast from './Toast';
import { isObject, isServer } from '../utils';
import { removeNode } from '../utils/dom/node';

const defaultOptions = {
  icon: '',
  type: 'text',
  // @deprecated
  mask: false,
  value: true,
  message: '',
  className: '',
  overlay: false,
  onClose: null,
  onOpened: null,
  duration: 2000,
  iconPrefix: undefined,
  position: 'middle',
  transition: 'van-fade',
  forbidClick: false,
  loadingType: undefined,
  getContainer: 'body',
  overlayStyle: null,
  closeOnClick: false,
  closeOnClickOverlay: false,
};

// default options of specific type
let defaultOptionsMap = {};

let queue = [];
let multiple = false;
let currentOptions = {
  ...defaultOptions,
};

// Toast loading 队列模式
// by yukapril 2023-11-4
// 每次 Toast.queueLoading()，计数器 +1
// 每次 Toast.queueClear()，计数器 -1
// 如果计数器超过 0，则显示一个 loading 实例，后续再次增加计数，也不增加实例
// 只能显示第一个 loading 配置的文案和效果
let queueCount = 0; // 当前队列 loading 数量
let queueStatus = false; // 当前是否展示 loading 中

function parseOptions(message) {
  if (isObject(message)) {
    return message;
  }

  return { message };
}

function isInDocument(element) {
  return document.body.contains(element);
}

function createInstance() {
  /* istanbul ignore if */
  if (isServer) {
    return {};
  }

  queue = queue.filter(
    (item) => !item.$el.parentNode || isInDocument(item.$el)
  );

  if (!queue.length || multiple) {
    const toast = new (Vue.extend(VueToast))({
      el: document.createElement('div'),
    });

    toast.$on('input', (value) => {
      toast.value = value;
    });

    queue.push(toast);
  }

  return queue[queue.length - 1];
}

// transform toast options to popup props
function transformOptions(options) {
  return {
    ...options,
    overlay: options.mask || options.overlay,
    mask: undefined,
    duration: undefined,
  };
}

function Toast(options = {}) {
  const toast = createInstance();

  // should add z-index if previous toast has not disappeared
  if (toast.value) {
    toast.updateZIndex();
  }

  options = parseOptions(options);
  options = {
    ...currentOptions,
    ...defaultOptionsMap[options.type || currentOptions.type],
    ...options,
  };

  if (process.env.NODE_ENV === 'development' && options.mask) {
    console.warn(
      '[Vant] Toast: "mask" option is deprecated, use "overlay" option instead.'
    );
  }

  options.clear = () => {
    toast.value = false;

    if (options.onClose) {
      options.onClose();
      options.onClose = null;
    }

    if (multiple && !isServer) {
      toast.$on('closed', () => {
        clearTimeout(toast.timer);
        queue = queue.filter((item) => item !== toast);

        removeNode(toast.$el);
        toast.$destroy();
      });
    }
  };

  Object.assign(toast, transformOptions(options));
  clearTimeout(toast.timer);

  if (options.duration > 0) {
    toast.timer = setTimeout(() => {
      toast.clear();
    }, options.duration);
  }

  return toast;
}

const createMethod = (type) => (options) =>
  Toast({
    type,
    ...parseOptions(options),
  });

['loading', 'success', 'fail'].forEach((method) => {
  Toast[method] = createMethod(method);
});

Toast.clear = (all) => {
  // 全部清空队列数据
  queueStatus = false;
  queueCount = 0;

  if (queue.length) {
    if (all) {
      queue.forEach((toast) => {
        toast.clear();
      });
      queue = [];
    } else if (!multiple) {
      queue[0].clear();
    } else {
      queue.shift().clear();
    }
  }
};

function showQueueLoading(...args) {
  if (queueCount > 0) {
    if (!queueStatus) {
      Toast.loading(...args);
      queueStatus = true;
    }
  } else {
    Toast.clear();
    queueCount = 0;
    queueStatus = false;
  }
}

Toast.queueLoading = (...args) => {
  queueCount++;
  showQueueLoading(...args);
};

Toast.queueClear = (...args) => {
  if (queueCount > 0) {
    queueCount--;
    showQueueLoading(...args);
  }
};

Toast.setDefaultOptions = (type, options) => {
  if (typeof type === 'string') {
    defaultOptionsMap[type] = options;
  } else {
    Object.assign(currentOptions, type);
  }
};

Toast.resetDefaultOptions = (type) => {
  if (typeof type === 'string') {
    defaultOptionsMap[type] = null;
  } else {
    currentOptions = { ...defaultOptions };
    defaultOptionsMap = {};
  }
};

Toast.allowMultiple = (value = true) => {
  multiple = value;
};

Toast.install = () => {
  Vue.use(VueToast);
};

Vue.prototype.$toast = Toast;

export default Toast;
