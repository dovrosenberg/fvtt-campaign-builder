<template>
  <div 
    class="wcb-bookmark-button" 
    :title="bookmark.header.name" 
    draggable="true"
    @click.left="onBookmarkClick"
    @contextmenu="onBookmarkContextMenu"
    @dragstart="onDragStart"
    @drop="onDrop"
    @dragover="onDragover"
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
  import { getValidatedData } from '@/utils/dragdrop';

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
      customClass: 'wcb',
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
  const onBookmarkClick = async (event: MouseEvent) => { 
    if (!props.bookmark)
      return;

    await navigationStore.openContent(props.bookmark.header.uuid, props.bookmark.tabInfo.tabType, { newTab: event.ctrlKey });
  };

  // handle a bookmark or tab dragging
  const onDragStart = (event: DragEvent): void => {
    const dragData = { 
      //from: this.object.uuid 
    } as { type: string; bookmarkId?: string};

    dragData.type = 'wcb-bookmark';
    dragData.bookmarkId = props.bookmark.id;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }; 

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    const target = (event.currentTarget as HTMLElement).closest('.wcb-bookmark-button') as HTMLElement;
    if (!target)
      return;

    if (data.bookmarkId === props.bookmark.id) return; // Don't drop on yourself

    // insert before the drop target
    const bookmarksValue = bookmarks.value;
    const from = bookmarksValue.findIndex(b => b.id === data.bookmarkId);
    const to = bookmarksValue.findIndex(b => b.id === props.bookmark.id);
    await navigationStore.changeBookmarkPosition(from, to);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
</script>

<style lang="scss">
  .wcb-bookmark-button, #wcb-add-bookmark {
    height: 28px;
    border-radius: 28px;
    margin-left: 4px;
    margin-top: 1px;
    line-height: 27px;
    padding: 0px 10px;
    font-size: 14px;
    cursor: pointer;
    flex-wrap: nowrap;
    flex-grow: 0;
    white-space: nowrap;
    border: 1px solid var(--wcb-header-nav-btn-border);
    background: var(--wcb-header-nav-btn-background);

    &#wcb-add-bookmark {
      border-radius: 4px;
      flex: 0 0 24px;
      height: 24px;
      font-size: 16px;
      padding-left: 2px;
      line-height: 22px;
      text-overflow: clip;
      margin-left: 2px;
      overflow: hidden;
      border: 1px solid var(--wcb-header-nav-btn-border);
      background: var(--wcb-header-nav-btn-background);
      color: var(--wcb-header-nav-btn-color);

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

    &:not(#wcb-add-bookmark) i {
      margin-top: 4px;
      margin-right: 2px;
    }

    &:hover {
      background: var(--wcb-header-bookmark-hover);
    }

    &#wcb-add-bookmark:not(.disabled):hover {
      background: var(--wcb-header-add-bookmark-hover);
    }
}
</style>