import { createNamespace } from '../utils';
import { ChildrenMixin } from '../mixins/relation';

const [createComponent, bem] = createNamespace('swipe-item');

export default createComponent({
  mixins: [ChildrenMixin('vanSwipe')],

  data() {
    return {
      offset: 0,
      inited: false,
      mounted: false,
    };
  },

  mounted() {
    this.$nextTick(() => {
      this.mounted = true;
    });
  },

  computed: {
    style() {
      const style = {};
      const { size, vertical } = this.parent;

      if (size) {
        style[vertical ? 'height' : 'width'] = `${size}px`;
      }

      style.transformStyle = 'preserve-3d';
      style.backfaceVisibility = 'hidden';

      if (this.offset) {
        // 尝试修复 iOS 卡顿问题 by yukapril
        if (vertical) {
          // Y
          style.transform = `translate3D(0, ${this.offset}px, 0)`;
        } else {
          // X
          style.transform = `translate3D(${this.offset}px, 0, 0)`;
        }
      }

      return style;
    },

    shouldRender() {
      const { index, inited, parent, mounted } = this;

      if (!parent.lazyRender || inited) {
        return true;
      }

      // wait for all item to mount, so we can get the exact count
      if (!mounted) {
        return false;
      }

      const active = parent.activeIndicator;
      const maxActive = parent.count - 1;
      const prevActive = active === 0 && parent.loop ? maxActive : active - 1;
      const nextActive = active === maxActive && parent.loop ? 0 : active + 1;
      const shouldRender =
        index === active || index === prevActive || index === nextActive;

      if (shouldRender) {
        this.inited = true;
      }

      return shouldRender;
    },
  },

  render() {
    return (
      <div class={bem()} style={this.style} {...{ on: this.$listeners }}>
        {this.shouldRender && this.slots()}
      </div>
    );
  },
});
