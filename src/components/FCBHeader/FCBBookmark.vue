<template>
  <div 
    class="fcb-bookmark-button" 
    :title="props.titleOverride ? props.titleOverride : bookmark.header.name" 
    draggable="true"
    @click.left="onBookmarkClick"
    @contextmenu="onBookmarkContextMenu"
    @dragstart="onDragStart"
    @drop="onDrop"
    @dragover="standardDragover"
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
  import { getValidatedData, standardDragover } from '@/utils/dragdrop';

  // local components

  // types
  import { Bookmark, BookmarkDragDropData, } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    bookmark: {
      type: Object as PropType<Bookmark>,
      required: true,
    },
    titleOverride: {
      type: String,
      default: '',
    },
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

    // Don't show context menu for session bookmark
    if (props.bookmark.id.startsWith('session-')) {
      return;
    }

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        // { 
        //   icon: 'fa-file-export',
        //   iconFontClass: 'fas',
        //   label: localize('contextMenus.bookmarks.openNewTab'), 
        //   onClick: async () => {
        //     if (props.bookmark.header.uuid) {
        //       await navigationStore.openContent(props.bookmark.header.uuid, props.bookmark.tabInfo.tabType, { newTab: true });
        //     }
        //   }
        // },
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
    // Don't allow dragging session bookmarks
    if (props.bookmark.id.startsWith('session-')) {
      event.preventDefault();
      return;
    }

    const dragData = { 
      //from: this.object.uuid 
      type: 'fcb-bookmark',
      bookmarkId: props.bookmark.id
    } as BookmarkDragDropData;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }; 

  const onDrop = async(event: DragEvent) => {
    event.preventDefault();  

    // Don't allow dropping on the session bookmark
    if (props.bookmark.id.startsWith('session-')) {
      return;
    }

    // parse the data - looking for bookmarks
    let data = getValidatedData(event) as BookmarkDragDropData | undefined;
    if (!data || data.type !== 'fcb-bookmark')
      return;

    const target = (event.currentTarget as HTMLElement).closest('.fcb-bookmark-button') as HTMLElement;
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
  .fcb-bookmark-button, #fcb-add-bookmark {
    font-family: var(--fcb-font-family);
    height: 1.75rem;
    border-radius: 28px;
    margin-left: 4px;
    margin-top: .0625rem;
    line-height: 1.6875rem;
    padding: 0px 10px;
    font-size: var(--fcb-font-size-large);
    cursor: pointer;
    flex-wrap: nowrap;
    flex-grow: 0;
    white-space: nowrap;
    border: 1px solid var(--fcb-button-border);
    background: var(--fcb-button-bg);
    color: var(--fcb-button-color);

    // Special styling for session bookmark
    &.fcb-session-bookmark {
      background: var(--fcb-primary);
      color: var(--fcb-text-on-primary);
      font-weight: 600;      

      &:hover {
        color: var(--fcb-primary);
        background: var(--fcb-text-on-primary);
      }
    }

    &#fcb-add-bookmark {
      border-radius: 4px;
      flex: 0 0 1.5rem;
      height: 1.5rem;
      font-size: 1rem;
      padding-left: 2px;
      line-height: 1.375rem;
      text-overflow: clip;
      margin-left: 2px;
      overflow: hidden;

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

    &:not(#fcb-add-bookmark) i {
      margin-top: .25rem;
      margin-right: 2px;
    }

    &:hover, &#fcb-add-bookmark:not(.disabled):hover {
      background: var(--fcb-button-bg-hover);
      border-color: var(--fcb-button-border-hover);
      color: var(--fcb-button-color-hover);
    }
}
</style>