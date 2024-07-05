<template>
  <section ref="contentRef"
    class="sheet fwb-journal-sheet"
  >
    <HomePage v-if="!currentEntryId || !entry"
    />
      
    <form v-else
      :class="'flexcol fwb-journal-subsheet ' + topic" 
    >
      <div class="sheet-container detailed flexcol">
        <header class="journal-sheet-header flexrow">
          <div class="sheet-image">
            <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
          </div>
          <section class="header-details fwb-content-header">
            <h1 class="header-name flexrow">
              <i :class="`fas ${icon} sheet-icon`"></i>
              <input 
                id="fwb-input-name" 
                name="name" 
                type="text" 
                :value="entry.name" 
                :placeholder="namePlaceholder"
              />
            </h1>
            <div class="form-group fwb-content-header">
              <label>{{localize('fwb.labels.fields.type')}}</label>
              <TypeAhead 
                :initialList="typeList"
                :initialValue="entry.flags[moduleJson.id].type"
                @itemAdded="onTypeItemAdded"
                @selectionMade="onTypeSelectionMade"
              />
            </div>

            <div v-if="showHierarchy"
              class="form-group fwb-content-header"
            >
              <Tree :topNodes="treeNodes" /> 
            </div>

          </section>
        </header>
        <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
          <a class="item" data-tab="description">{{localize('fwb.labels.tabs.description')}}</a>
          <a class="item" data-tab="entry-details">{{localize('fwb.labels.tabs.details')}}</a>
          <a v-for="relationship in relationships"
            class="item" :data-tab="relationship.tab"
          >
            {{localize(relationship.label)}}
          </a>
        </nav>
        <section class="fwb-tab-body flexcol">
          <div class="tab description flexcol" data-group="primary" data-tab="description">
            <div class="tab-inner flexcol">
              <Editor 
                :document="editorDocument"
                :hasButton="true"
                target="content-description"
                @editorSaved="onDescriptionEditorSaved"
              />
            </div>
          </div>
          <div class="tab entry-details" data-group="primary" data-tab="entry-details">
            <div class="tab-inner flexcol">
              entry-details
            <!-- {{!--
              <div class="details-section flexrow">
                <div class="document-details">
                  <ul>
                    {{#each fields}}
                    {{#unless this.full}}
                    <li {{#if this.hidden}} style="display:none;" {{/if}}>
                      <label>{{localize this.name}}</label>
                      <input type="text" name="flags.monks-enhanced-journal.attributes.{{this.id}}.value" value="{{ this.value }}" />
                    </li>
                    {{/unless}}
                    {{/each}}
                  </ul>
                </div>
              </div>
              <div class="details-section scrollable flexcol">
                {{#each fields}}
                {{#if this.full}}
                <div class="form-group" {{#if this.hidden}} style="display:none;" {{/if}}>
                  <label>{{localize this.name}}</label>
                  <textarea name="flags.monks-enhanced-journal.attributes.{{this.id}}.value">{{this.value}}</textarea>
                </div>
                {{/if}}
                {{/each}}
              </div>--}} -->
            </div>
          </div>
          <!-- <div class="tab relationships" data-group="primary" data-tab="relationships">
            <div class="tab-inner flexcol">
              <div class="relationships flexrow">
                <div class="items-list">
                  <ol class="item-list">
                    <li v-for="relationship in relationships" 
                      class="item-header flexrow"
                    >
                      <h3 class="item-name noborder flexrow">{{relationship.name}}</h3>
                      <h3 class="item-name noborder flexrow">{{localize('MonksEnhancedJournal.Relationship')}}</h3>
                      <div v-if="owner" 
                        class="item-controls flexrow" 
                        buttons="2"
                      ></div>
                    </li>
                    <li v-for="document in documents"
                      class="item flexrow" 
                      :data-id="document.id" 
                      :data-uuid="document.uuid" 
                      data-container="relationships" 
                      data-document="JournalEntry" 
                      draggable="false"
                    >
                      <div class="item-name clickable flexrow">
                        <img 
                          class="item-image large actor-icon" 
                          :src="document.img" 
                          onerror="if (!document.imgerr) { document.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/{{document.type}}.png' }" 
                        />
                        <h4>
                          <a>
                            <i v-if="document.pack"
                              class="fas fa-atlas" 
                              title="{{localize 'MonksEnhancedJournal.FromCompendium'}}"
                            ></i>
                            {{document.name}}
                          </a>
                        </h4>
                      </div>

                      <div class="item-name item-relationship flexrow">
                        <input 
                          type="text" 
                          class="item-field" 
                          :name="`relationships.${document.id}.relationship`" 
                          :value="document.relationship" 
                        />
                      </div>

                      <div v-if="owner" 
                        class="item-controls flexrow owner" 
                        buttons="2"
                      >
                        <input 
                          type="checkbox" 
                          :name="`relationships.${document.id}.hidden`" 
                          :checked="document.hidden" 
                          style="display:none;" 
                        />
                        <a class="item-control item-hide" title="{{localize 'MonksEnhancedJournal.HideShowRelationship'}}"><i class="fas fa-eye-slash"></i></a>
                        <a class="item-control item-delete" title="{{localize 'MonksEnhancedJournal.RemoveRelationship'}}"><i class="fas fa-trash"></i></a>
                      </div>
                    </li>
                     <li v-else-if="owner" 
                      class="instruction"
                    >
                      {{localize 'MonksEnhancedJournal.msg.DragToMakeRelationship'}}
                    </li>
                    <li v-else 
                      class="instruction"
                    >
                      {{localize 'MonksEnhancedJournal.msg.NoRelationshipsAtTheMoment'}}
                    </li> 
                  </ol>
                </div>
              </div>
            </div>
          </div> 
          <div class="tab offerings" data-group="primary" data-tab="offerings">
            <div class="tab-inner flexcol">
              <div class="offering-list">
                <div class="items-list">
                  <div class="item-header flexrow">
                    <h3 class="item-name noborder flexrow">Actor</h3>
                    <h3 class="item-name noborder flexrow">Items</h3>
                    <h3 class="item-detail noborder flexrow">Status</h3>

                    <div v-if="owner" 
                      class="item-controls flexrow" 
                      buttons="2"
                    ></div>
                    <div class="item-controls flexrow" buttons="2">
                      <a class="item-control make-offering" title="{{localize 'MonksEnhancedJournal.MakeOffering'}}"><i class="fas fa-hand-holding-usd"></i></a>
                    </div>
                  </div>
                  <ol class="item-list">
                    <li v-for="offering in offerings" 
                      class="item flexrow{{#if this.done}} complete{{/if}}" data-id="{{this.id}}" data-actor-id="{{this.actorId}}" data-container="offerings" draggable="false">
                      <div class="item-name flexrow">
                        <img class="item-image actor-icon" src="{{offering.img}}" />
                        <span>{{offering.name}}</span>
                      </div>

                      <div class="item-name item-offered flexcol">
                        <div v-for="item in offering.items" class="flexrow" style="width: 100%; line-height: 32px;">
                          <img class="item-image item-icon" src="{{item.img}}" onerror="if ($(this).attr('src') != 'icons/svg/item-bag.svg') { $(this).attr('src', 'icons/svg/item-bag.svg'); }" />
                          <span class="tag">{{{item.name}}}</span>
                        </div>
                      </div>

                      <div class="item-detail item-offered">
                        {{offering.stateName}}
                      </div>

                      <div v-if="owner" class="item-controls flexrow owner" buttons="2">
                        <div v-if="offering.state==='offering'">
                          <a class="item-control item-accept" title="{{localize 'MonksEnhancedJournal.AcceptOffering'}}"><i class="fas fa-check"></i></a>
                          <a class="item-control item-reject" title="{{localize 'MonksEnhancedJournal.RejectOffering'}}"><i class="fas fa-times"></i></a>
                        </div>

                        <div class="item-controls flexrow owner" buttons="2">
                          <input type="checkbox" name="offerings.{{this.id}}.hidden" {{checked this.hidden}} style="display:none;" />
                          <a class="item-control item-private" title="{{localize 'MonksEnhancedJournal.HideShowOffering'}}"><i class="fas fa-eye-slash"></i></a>
                          <a class="item-control item-delete" title="{{localize 'MonksEnhancedJournal.RemoveOffering'}}"><i class="fas fa-trash"></i></a>
                        </div>
                      </div>
                      <div v-else class="item-controls flexrow">
                        <div v-if="offering.owner">
                          <div v-if="offering.hidden">
                            <i class="fas fa-eye-slash"></i>
                          </div>
                          <div v-if="offering.state==='offering'">
                            <a class="item-control item-cancel" title="{{localize 'MonksEnhancedJournal.CancelOffering'}}"><i class="fas fa-trash"></i></a>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            </div> 
          </div>-->
          <div class="tab notes" data-group="primary" data-tab="notes">
            <div class="tab-inner flexcol">
              <div style="flex-grow: 0;">
                {{localize('MonksEnhancedJournal.OnlyViewable')}}
                <span v-if="!hasGM" style="color:darkred;font-weight:bold;">{{localize('MonksEnhancedJournal.msg.CannotEditNotesWithoutGM')}}</span>
              </div>
              <div class="notes-container">

                <!-- {{!-- {{editor userdata.enrichedText target=notesTarget editable=true button=true owner=owner}} --}} -->
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>	 
  </section>
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getCleanEntry, updateDocument } from '@/compendia';
  import { getIcon, toTopic } from '@/utils/misc';
  import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
  import { getGame, localize } from '@/utils/game';
  import { getHierarchyTree, hasHierarchy } from '@/utils/hierarchy';
  import moduleJson from '@module';
  import { useWorldBuilderStore } from '@/applications/stores/worldBuilderStore';

  import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
  // import { getCleanEntry, updateDocument } from '@/compendia';

  // library components

  // local components
  import Editor from '@/components/Editor.vue';
  import HomePage from '@/components/HomePage.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import Tree from '@/components/Tree/Tree.vue';

  // types
  import { Topic, TreeNode } from '@/types';
  import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';

  type Description = {
    content: any,
    format: number,
    markdown: any
  };

  ////////////////////////////////
  // props
  const props = defineProps({
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const worldBuilderStore = useWorldBuilderStore();
  const { currentEntryId } = storeToRefs(worldBuilderStore);

  ////////////////////////////////
  // data
  const topicData = {
    [Topic.Character]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Event]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Location]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Organization]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Scene]: { namePlaceholder: 'fwb.placeholders.sceneName', },
  };

  const relationships = [
    { tab: 'characters', label: 'fwb.labels.tabs.characters', },
    { tab: 'locations', label: 'fwb.labels.tabs.locations',},
    { tab: 'organizations', label: 'fwb.labels.tabs.organizations', },
    { tab: 'events', label: 'fwb.labels.tabs.events', },
    { tab: 'scenes', label: 'fwb.labels.tabs.scenes', },
  ] as { tab: string, label: string, }[];

  const tabs = ref<Tabs>();
  const entry = ref<JournalEntry | null>(null);
  const topic = ref<Topic | null>(null);
  const treeNodes = ref<TreeNode[]>([]);

  const editorDocument = ref<Document<any>>();

  const contentRef = ref<HTMLElement | null>(null);

  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getIcon(topic.value)));
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : localize(topicData[topic.value]?.namePlaceholder)));
  const typeList = computed((): string[] => (topic.value===null ? [] : moduleSettings.get(SettingKey.types)[topic.value]));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // new type added in the typeahead
  const onTypeItemAdded = async (added: string) => {
    if (topic.value === null)
      return;

    const currentTypes = moduleSettings.get(SettingKey.types);

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes[topic.value].includes(added)) {
      const updatedTypes = {
        ...moduleSettings.get(SettingKey.types),
        [topic.value]: currentTypes[topic.value].concat([added]),
      };
      await moduleSettings.set(SettingKey.types, updatedTypes);
    }
  };

  const onTypeSelectionMade = (selection: string) => {
    if (entry.value)
      EntryFlags.set(toRaw(entry.value), EntryFlagKey.type, selection);
  }

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!entry.value)
      return;

    const descriptionPage = toRaw(entry.value).pages.find((p)=>p.name==='description');  //TODO

    await updateDocument(descriptionPage, {'text.content': newContent });  

    //need to reset
    // if it's not automatic, clear and reset the documentpage
    // (this._partials.DescriptionEditoras as Editor).attachEditor(descriptionPage, newContent);
  }

  ////////////////////////////////
  // watchers
  watch(currentEntryId, async (newId: string | undefined): Promise<void> => {
    if (!newId) {
      entry.value = null;
      topic.value = null;
    } else {
      const newEntry = await getCleanEntry(newId);
      let newTopic;

      if (newEntry) {
        newTopic = toTopic(entry ? EntryFlags.get(newEntry, EntryFlagKey.topic) : null);
        if (!newTopic) 
          throw new Error('Invalid entry type in WBContent.getData()');
      }

      if (!newEntry || !newTopic) {
        // show the homepage
        entry.value = null;
        topic.value = null;
      } else {
        // we're going to show a content page
        entry.value = newEntry;
        topic.value = newTopic;

        // bind the tabs (because they don't show on the homepage)
        if (tabs.value && contentRef.value) {
          // have to wait until they render
          await nextTick();
          tabs.value.bind(contentRef.value);
        }

        // reattach the editor to the new entry
        editorDocument.value = newEntry.pages.find((p)=>p.name==='description');

        // update the tree for things with hierarchies
        if (hasHierarchy(newTopic)) {
          const pack = getGame().packs.get(newEntry.pack || '');

        if (pack)
          treeNodes.value = await getHierarchyTree(pack, newEntry);
        }
      }
    }
});


  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    tabs.value = new Tabs({ navSelector: '.tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });

    //     // watch for edits to name
    //     html.on('change', '#fwb-input-name', async (event: JQuery.ChangeEvent)=> {
    //       await updateDocument(this._entry, { name: jQuery(event.target).val() });
    //       await this._makeCallback(WBContent.CallbackType.NameChanged, this._entry);
    //     });

    //     // home page mode - click on a recent item
    //     this._partials.HomePage.registerCallback(HomePage.CallbackType.RecentClicked, async (uuid: string)=> {
    //       await this._makeCallback(WBContent.CallbackType.RecentClicked, uuid);
    //     });

    //     // tree node clicked
    //     this._partials.HierarchyTree.registerCallback(Tree.CallbackType.ItemClicked, async (value: string)=>{
    //       alert(value);
    //     });
    //   }
  });


</script>

<style lang="scss">

  .fwb-journal-sheet {
    &.sheet {
      height: 100%;
    }
    
    & > form {
      padding: 0px;
      overflow: hidden;
    }
    
    &.sheet {
      form {
        height: 100%;
      }
    
      .sheet-container {
        height: 100%;
        width: 100%;
        overflow: hidden;
        color: var(--mej-sheet-color);
      }
      
      .sheet-container.detailed {
        padding: 4px;
      }
      
      .sheet-container #context-menu {
        font-family: var(--font-primary);
      }
      
      .window-resizable-handle {
        z-index: 100;
      }

      .journal-sheet-header .sheet-image {
        flex: 0 0 160px;
        font-size: 13px;
        max-width: 160px;
        height: 160px;
        position: relative;
        border-radius: 5px;
        border: 1px solid var(--mej-icon-outline);
        margin-right: 6px;
        overflow: hidden;
      }
    
      .journal-sheet-header .sheet-image img.profile {
        width: 100%;
        height: 100%;
        object-fit: contain;
        max-width: 100%;
        border: 0px;
        background: var(--mej-icon-background);
        -webkit-box-shadow: 0 0 10px var(--mej-icon-shadow) inset;
        box-shadow: 0 0 10px var(--mej-icon-shadow) inset;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }
    
      /* Nav */
      .fwb-sheet-navigation {
        flex-grow: 0;
        flex: 0 0 30px !important;
        background: var(--mej-sheet-tab-background);
        padding-bottom: 5px;
        border-bottom: 2px groove var(--mej-sheet-tab-bottom-border);
        font-family: var(--mej-font-family);
        font-size: 20px;
        font-weight: 700;

        &.tabs {
          flex-wrap: wrap;
          
          .item {
            flex: 1;
            height: 30px !important;
            line-height: 32px;
            margin: 0 24px;
            border-bottom: var(--mej-sheet-tab-border);
            color: var(--mej-sheet-tab-color);
            max-width: 150px;
          }

          .item:hover {
            color: var(--mej-sheet-tab-color-hover);
          }

          .item.hasitems {
            border-bottom-color: var(--mej-sheet-tab-border-items);
          }

          .item.active {
            border-bottom-color: var(--mej-sheet-tab-border-active);
            color: var(--mej-sheet-tab-color-active);
          }

          .tab {
            flex: 1;
          }
        }
      }


      /* Dialog */
      .dialog-content {
        margin-bottom: 8px;
      }

      /* Header Details */
      .journal-sheet-header .header-details {
        font-size: var(--font-size-20);
        font-weight: 700;
        //overflow: hidden;
        /*width: calc(100% - 160px);*/
      }

      .journal-sheet-header .header-details input {
        border: var(--mej-sheet-header-input-border);
        background: var(--mej-sheet-header-input-background);
      }

      .journal-sheet-header .header-details .header-name {
        margin: 0;
      }

      .journal-sheet-header .header-details .header-name input[type="text"] {
        font-size: 32px;
        height: 36px;
      }

      .journal-sheet-header .header-details .form-group {
        margin: 4px 8px 0px 0px;
      }
      .journal-sheet-header .header-details .form-group label {
        max-width: 175px;
        color: var(--mej-sheet-header-label-color);
        text-align: left;
        background: none;
        border: none;
      }
      .journal-sheet-header .header-details .form-group input {
        font-size: var(--font-size-20);
        color: var(--mej-sheet-header-detail-input-color);
      }

      .journal-sheet-header .header-details .form-group select {
        border: var(--mej-sheet-header-input-border);
        font-size: inherit;
        font-family: inherit;
        height: calc(var(--font-size-20) + 6);
        margin: 0px;
        color: var(--mej-sheet-header-detail-input-color);
        background: var(--mej-sheet-header-input-background);
      }

      .journal-sheet-header .header-details .form-group select:hover {
        box-shadow: 0 0 8px var(--color-shadow-primary);
      }

      .fwb-content-header {
        overflow-y: visible;
      }

      .journal-sheet-header .header-details .header-name input[type="text"] {
        background: var(--mej-sheet-header-name-background);
        border: 1px solid transparent;
        color: var(--mej-sheet-header-name-color);
        margin-right: 2px;
      }

      .journal-sheet-header .header-details .header-name input[type="text"]:hover,
      .journal-sheet-header .header-details .header-name input[type="text"]:focus {
        background: var(--mej-sheet-header-name-background-hover);
      }

      // the tab content
      .fwb-tab-body {
        display: flex;
        flex: 1;

        /* Details Section */
        .details-section {
          font-family: var(--mej-font-family);
          font-size: var(--font-size-20);
          font-weight: 700;
          padding: 5px 15px;
          margin: 0px;
          flex-grow: 0;
          border-bottom: 2px groove var(--mej-sheet-details-section-border);

          &:last-child,
          &.no-border {
            border-bottom: 0px;
          }
          &.scrollable {
            flex-grow: 1;
            overflow-y: auto;
          }

          .form-group {
            flex-grow: 0 !important;
            margin: 4px 8px 0px 0px;
          }

          label {
            flex: 1;
            max-width: 175px;
            color: var(--mej-sheet-color);
          }
          input, textarea {
            border: var(--mej-sheet-input-border);
            background: var(--mej-sheet-input-background);
            color: var(--mej-sheet-input-color);
          }

          select {
            font-size: var(--font-size-20);
            height: 24px;
          }

          button {
            flex: 0;
            margin: -2px 0;
            line-height: 22px;
          }

          button.append {
            height: 27px;
            margin: 0px;
            border-top-left-radius: 0px;
            border-bottom-left-radius: 0px;
            order: 99;
          }

          button.append + input {
            border-top-right-radius: 0px;
            border-bottom-right-radius: 0px;
          }

          /* Document Details */
          .document-details {
            border-radius: 5px;
            padding: 8px;
            margin-bottom: 5px;
            position: relative;
            flex: 1;
            font-size: var(--font-size-14);

            ul {
              margin: 0;
              padding: 0;
              display: flex;
              gap: 4px;
              flex: 1;
              flex-wrap: wrap;
              list-style: none;

              li {
                display: flex;
                flex: 0 0 215px;

                label {
                  flex: 0 0 60px;
                }
              }
            }
          }
        }
      }


      /* Blank */
      .fwb-journal-subsheet.blank {
        display: flex;
        text-align: center;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-16);
        color: var(--mej-blank-color);
        font-weight: bold;

        .message {
          flex: 1;
          display: flex;
          justify-content: center;
          width: 100%;
          font-size: var(--font-size-24);
          font-style: italic;
        }

        .recently-viewed {
          margin-bottom: 20px;
          border-radius: 6px;
          background-color: var(--mej-blank-recent-background);
          border: 1px solid var(--mej-blank-recent-border);
          font-size: 20px;
          padding: 4px;
        }

        .recent-link,
        .new-link {
          cursor: pointer;
          padding: 4px;
        }

        .recent-link:hover,
        .new-link:hover {
          color: var(--mej-blank-link-hover);
        }
      }
    }

    .sheet-container a[disabled] {
      pointer-events: none;
    }

    .nav-button.convert #context-menu {
      margin-left: -95px;
    }

    /* Header */
    .sheet-container .journal-sheet-header {
      font-family: var(--mej-font-family);
      font-size: 24px;
      flex-grow: 0;
      border-bottom: 2px solid var(--mej-sheet-header-border);
      z-index: 1;
      padding-left: 8px;
    }

    .sheet-container.detailed .journal-sheet-header {
      align-items: flex-start;
      padding-bottom: 4px;
      /*flex: 0 0 162px;*/
      border-bottom: 2px groove var(--mej-sheet-detailed-header-border);
      margin: 0px;
      padding-left: 0px;
      position: relative;
    }

    .journal-sheet-header.header-name input[type="text"] {
      background: var(--mej-sheet-header-name-background);
      border: 1px solid transparent;
      color: var(--mej-sheet-header-name-color);
      margin-right: 2px;
      font-size: 28px;
      height: calc(100% - 2px);
    }

    .journal-sheet-header.header-name input[type="text"]:hover,
    .journal-sheet-header.header-name input[type="text"]:focus {
      background: var(--mej-sheet-header-name-background-hover);
    }

    .sheet-container .journal-sheet-header .sheet-icon {
      flex: 0 0 30px;
      line-height: 35px;
      margin-top: 0px;
      color: #777;
    }

    .sheet-container.detailed .journal-sheet-header .sheet-icon {
      flex: 0 0 20px;
      font-size: 20px;
      height: 20px;
      margin-top: 12px;
      margin-left: 5px;
      line-height: 15px;
    }

    &.image-popout.dark .journal-sheet-header input[type="text"] {
      color: #fff;
    }

    .journal-sheet-header.header-name .header-search {
      font-size: 14px;
      flex: 0 0 255px;
      color: var(--mej-sheet-color);

      i {
        flex: 0 0 25px;
        padding-left: 5px;
        line-height: 35px;
      }

      input[type="text"] {
        font-size: var(--font-size-14);
        height: 25px;
        margin-top: 6px;
        margin-right: 4px;
        border: 1px solid var(--mej-sheet-header-search-border);
        background: var(--mej-sheet-header-search-background);
        color: var(--mej-sheet-header-search-color);
    
        &::placeholder {
          color: var(--mej-sheet-header-search-placeholder);
        }
      
        &:hover,
        &:focus {
          background: var(--mej-sheet-header-search-background-hover);
        }
      }
    }

    .fwb-journal-subsheet:not(.gm) .gm-only {
      display: none;
    }
    
    .fwb-journal-subsheet:not(.owner) .owner-only {
      display: none;
    }
    
    .journal-sheet-header {
      button {
        flex: 0 0 30px;
        height: 30px;
        width: 30px;
        border: none;
        font-size: 18px;
        line-height: 28px;
        padding: 0px 3px;
        cursor: pointer;
        box-shadow: none;
        color: var(--mej-sheet-header-button-color);
        background: var(--mej-sheet-header-button-background);
        border-radius: 3px;
        margin-top: 3px;
        margin-right: 5px;
      }
    
      .header-details button {
        margin-right: 4px;

        &:last-child {
          margin-right: 8px;
        }
      }

      button.loading {
        padding-top: 1px;
        padding-left: 5px;
      }

      button.active {
        border: 1px solid var(--mej-active-color);
        color: var(--mej-active-color);
      }
    }

    /* Page Controls (Mostly for list)*/
    .page-controls {
      flex-grow: 0;
      padding-top: 1px;
      border-bottom: 2px groove var(--mej-sheet-details-section-border);

      button {
        flex: 0 0 130px;
        background: var(--mej-sheet-page-control-background);
        color: var(--mej-sheet-page-control-color);
      }

      button:hover {
        background: var(--mej-sheet-page-control-background-hover);
      }

      button.header-control {
        flex: 0 0 30px;
      }
    }

    /* Body */
    .sheet-container .fwb-tab-body {
      height: 100%;
      overflow: hidden;
      position: relative;
    }



    /* Tabs */
    &.sheet .fwb-tab-body .tab {
      height: 100% !important;
      overflow-y: auto !important;
      align-content: flex-start;
      flex: 1;
    }

    &.sheet .fwb-tab-body .tab .tab-inner {
      height: 100%;
      overflow-y: auto !important;
      align-content: flex-start;
      position: relative;

      &.flexcol {
        flex:1;
      }
    }

    .tab.notes .notes-container {
      overflow: auto;
      border: var(--mej-sheet-input-border);
      background: var(--mej-sheet-input-background);
      color: var(--mej-sheet-input-color);
      border-radius: 4px;
      margin-bottom: 3px;
    }

    .tab.notes .notes-container .editor-content {
      padding: 0px 6px;
    }

    /* Editor */
    &.sheet .editor {
      overflow: visible;
      height: 100%;
      min-height: 100%;
    }

    // the button to open the editor
    .editor-edit {
      z-index: 100;

      &:hover {
        color: rgb(var(--mej-dark-0));
        background: var(--mej-cream);
        box-shadow: 0 0 5px red;
      }
    }

    &.sheet .editor .editor-content {
      overflow-y: visible;
      height: unset;
      min-height: calc(100% - 8px);
      padding: 2px;
    }

    &.sheet .editor .tox-tinymce {
      height: 100% !important;
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }

    &.sheet .editor.tinymce {
      margin: 0px;
    }

    &.sheet .editor .tox-toolbar-overlord {
      background-color: rgba(255, 255, 255, 0.4);
    }

    &.sheet .editor .tox-tinymce .tox-menubar button {
      height: 15px;
    }

    &.sheet .editor .tox-tinymce .tox-promotion-link {
      display: none;
    }

    
    // .fwb-journal-subsheet[editable='false'] .editor-edit {
    //   display: none !important;
    // }

    .tox.tox-tinymce-aux {
      width: 0px;
    }

    &.sheet .editor-content .polyglot-journal {
      cursor: help;
      background-color: rgba(var(--polyglot-journal-color), 0.1);
    }

    &.sheet .editor-content .polyglot-journal:hover {
      background-color: rgba(var(--polyglot-journal-color), var(--polyglot-journal-opacity));
    }

    /* Item List */
    .items-list {
      list-style: none;
      margin: 0;
      padding: 0;
      color: var(--mej-itemlist-colour);
      overflow-y: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      justify-content: flex-start;

      .item-list {
        overflow-y: auto;
        height: 100%; /* Unlocked this for the shop instructions */
        list-style: none;
        margin: 0;
        padding: 0;
        scrollbar-width: thin;
        position: relative;
      }
      .item-list.min-height {
        min-height: 80px;
      }

      .item-list ul {
        margin: 0px;
        padding: 0 0 0 5px;
      }

      .item-header {
        font-family: var(--mej-font-family);
        font-size: var(--font-size-14);
        text-align: center;
        height: 29px;
        margin: 2px 0;
        margin-left: 1px;
        padding: 0;
        align-items: center;
        background: var(--mej-itemlist-background);
        border: 2px groove var(--mej-itemlist-border);
        color: var(--mej-sidebar-input-color);
        font-weight: bold;
      }

      .item-list .item-header {
        margin-left: 4px;
      }

      .item-header h3 {
        padding-left: 5px;
        font-family: var(--mej-font-family);
        font-weight: 700;
        text-align: left;
        font-size: var(--font-size-16);
        margin-bottom: 1px;
        color: var(--mej-itemlist-header-color);
      }

      .item-header .collapse-text {
        display: none;
        margin-left: 10px;
        font-size: var(--font-size-14);
      }

      .item-header.collapsed .collapse-text {
        display: inline-block;
      }

      .item-header .button-group {
        flex-shrink: 1;
        flex-grow: 0;
        flex-wrap: nowrap;
        margin-right: 4px;
      }

      .item-detail {
        flex: 0 0 80px;
        justify-content: center;
        align-items: center;
        text-align: center;
      }

      .item-controls {
        flex: 0 0 24px;
        justify-content: space-between;
        align-items: center;
        margin-left: 8px;
      }
      .item-controls[buttons="2"] {
        flex: 0 0 48px;
      }
      .item-controls[buttons="3"] {
        flex: 0 0 72px;
      }
      .item-controls[buttons="4"] {
        flex: 0 0 96px;
      }
      .item-header .item-controls {
        justify-content: center;
      }

      .item-controls *:disabled {
        cursor: no-drop;
      }

      .item-controls a {
        font-size: var(--font-size-12);
        text-align: center;
        padding: 0px;
        margin: 0px;
        color: var(--mej-itemlist-control-color);
      }

      .item-list .item-controls {
        a:hover {
          color: var(--mej-itemlist-control-color-hover);
        }

        a.active,
        input[type='checkbox']:checked + a {
          color: var(--mej-active-color);
        }
      }
      .item-list .item-detail input[type='checkbox']:checked + a,
      input[type='checkbox']:checked + a {
        color: var(--mej-active-color);
      }

      .item-header .item-control {
        font-size: var(--font-size-12);
        text-align: center;
        padding: 0px;
        margin: 0px;
        margin-right: 2px;
        width: 22px;
        flex: 0 0 22px;
        height: 22px;
        border-radius: 2px;
        border: 1px solid var(--mej-itemlist-control-border);
        background: var(--mej-itemlist-control-background);
        color: var(--mej-itemlist-header-control-color);
        line-height: 22px;
      }

      .item-control.text {
        width: fit-content;
        white-space: nowrap;
        padding: 0px 5px;
      }

      .item {
        align-items: center;
        padding: 0 2px;
        border-bottom: 1px solid var(--mej-itemlist-item-border);
      }

      .item:last-child {
        border-bottom: none;
      }

      .item-name {
        flex: 2;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: var(--font-size-14);
        text-align: left;
        align-items: center;
        border-bottom: 0px;
      }

      .item-name h3,
      .item-name h4 {
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item .item-name {
        color: var(--mej-itemlist-item-name);
      }
      .item .item-name.item-received {
        flex: 0 0 auto;
        color: var(--mej-itemlist-item-disabled);
      }

      .item .item-name .highlight-text {
        font-size: var(--font-size-12);
        font-style: italic;
      }

      .item .item-name .item-image {
        flex: 0 0 30px;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 2px;
        margin-right: 5px;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        object-fit: contain;
      }

      .item .item-name .item-image + .no-actor {
        font-size: 20px;
        position: absolute;
        color: #ee8e26;
        top: 10px;
        left: 50px;
      }

      .item .item-name .item-image.large {
        flex: 0 0 70px;
        width: 70px;
        height: 70px;
      }

      .item .item-name.clickable .item-image {
        cursor: pointer;
      }

      .item.empty .item-name .item-image {
        filter: grayscale(100%);
        opacity: 0.7;
      }

      .item .item-name.rollable:hover .item-image {
        background-image: url('../../../icons/svg/d20-grey.svg') !important;
      }

      .item .item-name.rollable .item-image:hover {
        background-image: url('../../../icons/svg/d20-black.svg') !important;
      }

      .items-list.alternate-rows li:nth-child(even) {
        background-color: var(--mej-itemlist-alternate-row);
      }

      .item input {
        border-color: var(--mej-itemlist-input-border);
        color: var(--mej-itemlist-input-color);
        background-color: var(--mej-itemlist-input-background);
      }

      .item input:hover  {
        border-color: unset;
      }

      .item .item-content {
        color: var(--mej-itemlist-item-content);
      }

      .item .item-summary {
        flex: 0 0 100%;
        padding: 0.5rem;
        border-top: 1px solid var(--faint-color);
        font-size: var(--font-size-12);
      }

      .item-header .item-from {
        flex: 0 0 140px;
        text-align: left;
      }

      .item .item-from {
        flex: 0 0 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        align-items: start;
        text-align: left;
      }

      .item .item-assigned {
        text-align: center;
      }
    }

    /* Currency Group */
    .currency-group {
      font-size: var(--font-size-12);
      flex: 0 0 64px;
    }

    .currency-group .form-fields {
      margin-left: 10px;
      padding-top: 2px;
    }

    .currency-group .form-fields label {
      font-weight: bold;
      padding-top: 2px;
      max-width: 75px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 26px;
    }

    .currency-group .form-fields label:not(:first-child) {
      padding-left: 10px;
    }

    .currency-group .form-fields input {
      flex: 2;
      text-align: right;
      max-width: 75px;
      height: var(--form-field-height);
      color: var(--color-text-dark-primary);
      background: var(--mej-sheet-input-background);
      border: var(--mej-sheet-input-border);
    }

    /* Additional */
    .sheet-container .fwb-tab-body .no-character-alert {
      background: rgba(214, 150, 0, 0.8);
      border: 1px solid var(--color-level-warning);
      margin-bottom: 0.5em;
      padding: 6px 8px;
      line-height: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px var(--color-shadow-dark);
      color: var(--color-text-light-1);
      font-size: var(--font-size-14);
      text-shadow: 1px 1px black;
      flex: 0 0 33px;
    }

    .sheet-container .fwb-tab-body .no-character-alert a {
      color: var(--color-text-hyperlink);
    }

    .instruction {
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      top: 0px;
      width: 100%;
      pointer-events: none;
      line-height: 60px;
      color: var(--mej-instruction);
      font-size: var(--font-size-16);
      font-style: italic;
      height: calc(100% - 50px);
    }

    .items-list li.instruction {
      height: calc(100% - 40px);
      line-height: 100px;
      background: transparent;
    }


    /* Text Entry */
    .fwb-journal-subsheet div[data-tab='picture'] #context-menu {
      top: calc(50% - 33px);
      left: calc(50% - 100px);
      max-width: 200px;
    }

    &.sheet .fwb-journal-subsheet div[data-tab='picture'].tab {
      overflow-y: hidden !important;
      overflow-x: hidden !important;
    }

    /* List */
    .list .list-list {
      padding-left: 0px;
      margin: 0px;
      height: 100%;
      overflow: auto;
    }

  /*  .list-list .document.item {
      padding: 6px;
      line-height: 24px;
    }

    .list-list .document.item:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .list-list .create-entry {
      flex: 0 0 20px;
      font-size: var(--font-size-14);
    }

    .list-list .folder header {
      border-left: 1px solid #000;
      border-right: 1px solid #000;
    }

    .list-list .list-item.document h3 {
      margin-bottom: 0px;
      flex-grow: 0;
      white-space: nowrap;
    }

    .list-list .list-item h3.progress-title {
      padding: 4px;
      border: 1px solid rgb(var(--mej-light-5));
      background: rgba(var(--mej-light-1), 0.2);
      border-radius: 4px;
      text-align: center;
    }

    .list-list .list-item h3.progress-title:empty {
      display: none;
    }

    .list-list .list-item.checked h3 {
      text-decoration: line-through;
    }

    .list-list .subdirectory .subdirectory {
      margin-bottom: 2px;
    }

    .list-list .subdirectory .folder {
      border-left: 0px;
    }

    .list-list li.folder > .folder-header {
      background: rgb(130, 128, 121);
      color: #fff;
    }

    .list-list li.folder.collapsed > .folder-header {
      background: rgb(110, 109, 103);
    }

    .list-list .subdirectory {
      padding-left: 10px;
      border-left: 4px solid #808080;
      border-bottom: 4px solid #808080;
    }

    .list-list .item-checked {
      margin-right: 8px;
    }

    .monks-enhanced-journal .list #context-menu {
      max-width: 200px;
    }

    .list .list-list button {
      background: var(--mej-sheet-button-background);
      color: var(--mej-sheet-button-color);
    }

    .list .list-list button:hover {
      background: var(--mej-sheet-button-background-hover);
    }

    .list-list .progress {
      width: 100%;
      height: 24px;
      min-height: 24px;
      background: rgb(80, 80, 76);
      border: 2px solid var(--color-border-dark);
      box-shadow: 0 0 4px #b2c3ff;
      border-radius: 4px;
      margin: 0px 4px;
      position: relative;
    }
    .list-list .progress:first-child {
      margin-left: 0px;
    }
    .list-list .progress:last-child {
      margin-right: 0px;
    }
    .list-list .progress-value {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      text-align: center;
      color: #ffffff;
    }
    .list-list .progress-bar {
      position: relative;
      margin: 1px;
      height: calc(100% - 2px);
      background: var(--mej-list-progress-background);
      border: 1px solid var(--mej-list-progress-border);
      border-radius: 2px;
    }

    .list .list-list .progress-button {
      height: 25px;
      flex: 0 0 25px;
      font-size: 12px;
      line-height: 23px;
      padding: 0px 5px;
      padding-left: 5px;
      padding-right: 2px;
    }

    .list .list-list .progress-text {
      max-height: 200px;
      -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
      overflow: hidden;
    }

    .list .list-list .progress-text.expand {
      max-height: none;
      mask-image: none;
      -webkit-mask-image: none;
      transition: max-height 1s linear;
    }

    .list .list-list .progress-expand {
      flex-grow: 0;
      color: rgb(var(--mej-dark-6));
      cursor: pointer;
    }
    .list .list-list .progress-expand:hover {
      color: rgb(var(--mej-dark-4));
    }

    .list .list-list .progress-container {
      flex-grow: 0;
    }

    .list .list-list .vote-button {
      height: 34px;
      flex: 0 0 100px;
    }

    .list .list-list .players-voted {
      margin: 0px;
      padding: 0px;
      line-height: 18px;
    }

    .list .list-list .players-voted .player-vote {
      width: 14px;
      line-height: 12px;
      font-size: 10px;
      font-family: var(--font-primary);
      text-align: center;
      color: #000;
      font-weight: 700;
      background-color: #fff;
      border: 1px solid #000;
      border-radius: 8px;
      display: inline-block;
    }

    .list .list-list .list-item .poll-toggle {
      flex: 0 0 19px;
      padding: 0px 4px;
      cursor: pointer;
    }

    .list .list-list .list-item .poll-description {
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(0, 0, 0, 0.2);
      max-height: 200px;
      overflow-y: auto;
    }

    .list .list-list .list-item .poll-description.collapsed {
      display: none;
    }
    .list-edit .editor {
      height: 100%;
    }

    .list-edit .editor .tox.tox-tinymce {
      height: 300px !important;
    }

    .list .list-list .list-item #context-menu {
      left: var(--mej-context-x);
      top: var(--mej-context-y);
    }
  */

  }


  /*
  body:not(.system-pf2e) .fwb-journal-sheet .sheet-container .tag {
    display: inline-block;
    margin: 0 2px 0 0;
    padding: 0 3px;
    font-size: var(--font-size-10);
    line-height: 16px;
    border: 1px solid #999;
    border-radius: 3px;
    background: rgba(var(--mej-dark-0), 0.05);
    padding: 4px 8px;
    flex-grow: 0;
    height: 24px;
    margin-top: 2px;
  }
  */
</style>