<template>
  <div 
    class="fwb-bookmark-button" 
    :title="bookmark.header.name" 
    draggable="true"
    @click.left="onBookmarkClick"
    @contextmenu="onBookmarkContextMenu"
    @dragstart="onDragStart"
    @drop="onDrop"
  >
    <div>
      <i 
        v-if="bookmark.header.icon"
        :class="'fas '+ bookmark.header.icon"
      ></i> 
      {{ bookmark.header.name }}
    </div>
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useNavigationStore } from '@/applications/stores';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components

  // types
  import { Bookmark, } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    bookmark: {
      type: Object as PropType<Bookmark>,
      required: true,
    } 
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const { bookmarks } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  const onBookmarkContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-file-export',
          iconFontClass: 'fas',
          label: localize('contextMenus.bookmarks.openNewTab'), 
          onClick: async () => {
            if (props.bookmark.header.uuid)
              await navigationStore.openContent(props.bookmark.header.uuid, props.bookmark.tabInfo.tabType, { newTab: true });
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.bookmarks.delete'), 
          onClick: async () => {
            await navigationStore.removeBookmark(props.bookmark.id);
          }
        },
      ]
    });
  };

  ////////////////////////////////
  // event handlers
  const onBookmarkClick = async () => { 
    if (!props.bookmark)
    return;

    await navigationStore.openContent(props.bookmark.header.uuid, props.bookmark.tabInfo.tabType, { newTab: false });
  };

  // handle a bookmark or tab dragging
  const onDragStart = (event: DragEvent): void => {
    const dragData = { 
      //from: this.object.uuid 
    } as { type: string; bookmarkId?: string};

    dragData.type = 'fwb-bookmark';
    dragData.bookmarkId = props.bookmark.id;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }; 

  const onDrop = async(event: DragEvent) => {
    if (event.dataTransfer?.types[0]==='text/plain') {
      let data;

      try {
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
      }
      catch (err) {
        return false;
      }

      const target = (event.currentTarget as HTMLElement).closest('.fwb-bookmark-button') as HTMLElement;
      if (!target)
        return false;

      if (data.bookmarkId === props.bookmark.id) return; // Don't drop on yourself

      // insert before the drop target
      const bookmarksValue = bookmarks.value;
      const from = bookmarksValue.findIndex(b => b.id === data.bookmarkId);
      const to = bookmarksValue.findIndex(b => b.id === props.bookmark.id);
      await navigationStore.changeBookmarkPosition(from, to);

      return true;
    } else {
      return false;
    }
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
</script>

<style lang="scss">
  .fwb-bookmark-button, #fwb-add-bookmark {
    height: 28px;
    border-radius: 28px;
    margin-left: 4px;
    margin-top: 4px;
    line-height: 27px;
    padding: 0px 10px;
    font-size: 14px;
    cursor: pointer;
    flex-wrap: nowrap;
    flex-grow: 0;
    white-space: nowrap;
    border: 1px solid var(--fwb-header-bookmark-border);
    background: var(--fwb-header-bookmark-background);

    &#fwb-add-bookmark {
      border-radius: 4px;
      flex: 0 0 24px;
      height: 24px;
      margin-top: 6px;
      font-size: 16px;
      padding-left: 2px;
      line-height: 22px;
      text-overflow: clip;
      margin-left: 2px;
      overflow: hidden;
      border: 1px solid var(--fwb-header-add-bookmark-border);
      background: var(--fwb-header-add-bookmark-background);
      color: var(--fwb-header-add-bookmark-color);

      &.disabled {
        cursor: default;
        color: #999;
      }
    }

    & > div {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    &:not(#fwb-add-bookmark) i {
      margin-top: 4px;
      margin-right: 2px;
    }

    &:hover {
      background: var(--fwb-header-bookmark-hover);
    }

    &#fwb-add-bookmark:not(.disabled):hover {
      background: var(--fwb-header-add-bookmark-hover);
    }
}
</style>