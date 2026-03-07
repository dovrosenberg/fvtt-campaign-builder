/**
 * Mock Calendaria service for POC/testing.
 * Generates mock notes for timeline visualization.
 */

import CalendarAdapter from './calendarAdapter';

const noteData = [
  {
    "name": "The Long Thaw Floods Elysian Vale",
    "content": "<p>An unseasonably prolonged thaw sent snowmelt rushing down from the high hills and into @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] over a period of six weeks, inundating fields that had been farmed for generations. Communities across the vale relocated livestock to higher ground. The resulting mud season lasted well into midsummer and the region's grain output did not recover for three years.</p>"
  },
  {
    "name": "Eldergrove Marsh Expands West",
    "content": "<p>Over the course of a single wet season, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] extended its western edge by nearly a league, consuming pastureland and two small farmsteads. Surveyors sent by @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] confirmed the change was not the result of rainfall alone. The rate of expansion exceeded anything recorded since the marsh's earliest documentation.</p>"
  },
  {
    "name": "The Blight of Rolling Hills",
    "content": "<p>A fungal blight swept through the farmlands of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] over two full seasons, blackening crops from root to stalk. No remedy proved effective until the infected fields were burned. The economic impact fell hardest on the tenant farmers supplying @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38], and rationing remained in place for nearly a year after the blight subsided.</p>"
  },
  {
    "name": "The Road Wars of the Dire Straight",
    "content": "<p>A prolonged dispute between two rival transport guilds over cargo rights along @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] escalated over several months into harassment, sabotage, and open violence. Trade through @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] slowed to a fraction of its normal volume. The conflict was ultimately resolved by decree from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s council after both guilds had suffered enough losses to accept arbitration.</p>"
  },
  {
    "name": "The Drowned Choir's Spreading Influence",
    "content": "<p>Over a period spanning more than a year, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] quietly extended its reach from the edges of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] into the outlying settlements of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa]. Converts were made in fishing communities, river hamlets, and at least one fortified waystation. The full extent of the cult's membership was not known to any single authority.</p>"
  },
  {
    "name": "Construction of Starlight Haven's South Wall",
    "content": "<p>Following years of encroachment from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS], the town council of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] commissioned a full stone wall along the town's southern boundary. Construction took fourteen months, was disrupted three times by unexplained accidents, and required two replacement project supervisors before completion. The finished wall is considerably thicker at its midpoint than the original plans specified.</p>"
  },
  {
    "name": "The Empathy Alliance Spreads Across the Vale",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] expanded from a single chapter in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] to maintain active relief operations across the breadth of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] over a period of three years. Disputes with local councils who resented their growing influence arose in at least four settlements. The alliance's reputation for appearing wherever need was greatest, regardless of politics, made it both admired and mistrusted.</p>"
  },
  {
    "name": "The Great Dry Season of Elysian Vale",
    "content": "<p>A drought lasting nearly eight months parched the lowlands of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa], reducing @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] to a fraction of its normal flow. Wells failed across the region. Paradoxically, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] did not shrink — it is the only body of water in the region whose level did not drop during the drought.</p>"
  },
  {
    "name": "The Harmonic Society's Grand Tour",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] undertook an extended performance tour through all major settlements in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] spanning the better part of a year. The tour was ostensibly cultural but the society's route mapped with suspicious precision onto @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc]'s known areas of influence, as though the two were engaged in a contest no audience was aware they were witnessing.</p>"
  },
  {
    "name": "The Plague of Whispers",
    "content": "<p>A strange affliction spread through @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and the outlying farms of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] over a period of three months. Those affected reported hearing voices at the threshold of sleep, waking with no memory of the content but an unshakeable conviction that they had been told something important. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.JX1CKzo45ehiaR73] treated over sixty cases. The affliction vanished as abruptly as it had come.</p>"
  },
  {
    "name": "Collapse of the Northern Cavern Passage",
    "content": "<p>A significant section of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh] collapsed without warning, sealing the deep chambers that had been under cautious exploration for several years. Two surveyors were trapped for eleven days before a rescue shaft was completed. What the collapse revealed in the newly exposed rock face was documented only in a sealed report held by the council of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38].</p>"
  },
  {
    "name": "The Season of Dead Fires",
    "content": "<p>For nearly four months, every fire lit within a half-league of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] extinguished itself within the hour, regardless of conditions. The phenomenon affected hearths, forges, torches, and bonfires alike. No natural explanation was confirmed. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] posted observers throughout the season. Their records were extensive and their conclusions were shared with no one outside the circle.</p>"
  },
  {
    "name": "The Lantern Circle Grows",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] grew from a small gathering to a network of over forty members across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] during a span of three years in which regional anxieties about @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] ran high. Its membership included farmers, merchants, a physician, a cartographer, and at least one person employed by the town watch of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38].</p>"
  },
  {
    "name": "The Starlight Haven Trade Compact",
    "content": "<p>After months of negotiation, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] ratified a regional trade compact with eight surrounding settlements, standardizing weights, measures, and market-day schedules across the breadth of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk]. The compact transformed the town into the de facto economic hub of the region. Disputes over implementation continued for years afterward.</p>"
  },
  {
    "name": "The Migration of the Hill Clans",
    "content": "<p>Three semi-nomadic clans that had grazed the high ridges above @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] for generations descended permanently into the lowlands over a period of two years. They gave no single reason, though all three clans described feeling watched from the high ground. Their relocation permanently altered land-use patterns across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] and placed new pressure on the resources of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38].</p>"
  },
  {
    "name": "The Silt Crisis of the Dire Straight",
    "content": "<p>Unusual sediment accumulation in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] made the river impassable to cargo vessels for an entire summer, cutting the primary supply route into @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] from the south. Emergency overland routes were established through @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] at significant cost. The sediment did not match any known geological source upstream.</p>"
  },
  {
    "name": "Three Winters Without Wolves",
    "content": "<p>For three consecutive years, the wolf packs that had ranged across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] and the upland edges of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] vanished entirely. Rabbit and deer populations surged in the absence of predators, causing crop damage that offset the relief of having no wolf losses among livestock. The packs did not return until the fourth winter, and they came from the direction of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS].</p>"
  },
  {
    "name": "The Building of the Cavern Road",
    "content": "<p>A consortium of mining interests funded the construction of a proper paved road from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] to the entrance of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh], a project that took eighteen months and was interrupted four times by collapses, a labor dispute, and one incident the project foreman refused to put in writing. The road remains in use, though certain sections are considered unlucky by workers who travel it at night.</p>"
  },
  {
    "name": "The Enchantment Panic",
    "content": "<p>A series of incidents in which enchanted goods from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.cpCTOklrzZwY81RA] and similar establishments allegedly caused harm triggered a months-long panic in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and several neighboring communities. Whether the enchantments had actually failed was never definitively resolved. Trade in magical goods dropped by two-thirds across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] for the better part of a year before confidence slowly returned.</p>"
  },
  {
    "name": "The River Festival Becomes Permanent",
    "content": "<p>What began as a one-time celebration of a treaty with upriver settlements along @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] grew over a decade into an annual week-long festival that defined the social calendar of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa]. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] claimed the right to open each festival with a dawn performance — a right that has never been seriously challenged.</p>"
  },
  {
    "name": "The Disputed Inheritance of Rolling Hills",
    "content": "<p>The death of the largest landholder in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] without a clear heir triggered a legal dispute that occupied the courts and councils of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] for over two years. Four parties claimed portions of the estate. The land was ultimately divided in a settlement that satisfied no one, and the boundaries it created have been contested at a low level ever since.</p>"
  },
  {
    "name": "The Marsh Recedes — Then Returns",
    "content": "<p>For a period of five years, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] pulled back measurably from its western and southern edges, exposing old agricultural land that settlers quickly reclaimed. Then, in a single wet season, every inch of reclaimed ground flooded again and the settlements built on it were not salvageable. The speed of the return was widely described as deliberate. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] was reported repeatedly in the weeks following the return.</p>"
  },
  {
    "name": "The Founding of the Empathy Alliance",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] was constituted in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] following a particularly harsh winter that left the surrounding villages of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] without adequate supplies or medical aid. Twelve founding members agreed on a single operating principle: the alliance responds to need and asks no political questions of those it helps. Within three years its membership had tripled and its reputation had spread across the region.</p>"
  },
  {
    "name": "Seven Years of Mist Over the Vale",
    "content": "<p>For seven consecutive years, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] experienced heavy morning mists that did not burn off until well past noon, even in high summer. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.otDnRZTdcda4DZeP] spent two of those years charting the mist's edge each morning and noted that its boundary corresponded almost exactly with the known extent of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS]'s influence. The mists stopped in the same season that @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] was first named in a public record.</p>"
  },
  {
    "name": "The Founding of Starlight Haven",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] was established as a permanent settlement after several years of informal encampment by displaced valley families seeking defensible ground near @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC]. The founding charter was signed by eleven family heads. Its earliest structures were built from reclaimed river timber. The town grew unevenly for two decades before achieving enough stability to attract a permanent market.</p>"
  },
  {
    "name": "The Toll Bridge Dispute",
    "content": "<p>A coalition of merchants trading across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] refused for an entire year to pay a toll levied by a local baron on the primary crossing. Both sides organized, hired negotiators, and briefly resorted to blockade. The eventual settlement created a shared governance structure for the river crossings that endured for generations. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] emerged from the dispute with more control over regional commerce than it had previously held.</p>"
  },
  {
    "name": "The Drowned Choir's First Public Act",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] announced its existence publicly with a dawn ceremony held openly at the edge of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] that drew curious onlookers and alarmed officials from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]. The ceremony lasted three hours, was peaceful, and was well organized. The deliberate normalcy of it unsettled authorities more than violence would have, because it left no grounds for official response.</p>"
  },
  {
    "name": "The Rebuilding After the River Broke",
    "content": "<p>A catastrophic flood along @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] destroyed the lower district of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and damaged farmland across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk]. The reconstruction effort took four years and reshaped the town's layout entirely. The elevated main road that now defines @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s commercial spine was a direct consequence of rebuilding on higher ground.</p>"
  },
  {
    "name": "The Warding of Eldergrove Marsh",
    "content": "<p>An effort coordinated between @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] and @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] over a period of several months established protective markers along the accessible edges of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS]. Neither organization publicized the effort. Whether the warding worked is debated: disappearances near the marsh declined for two years, then resumed.</p>"
  },
  {
    "name": "A Generation of Misrule in Starlight Haven",
    "content": "<p>A period lasting nearly two decades in which @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s council was dominated by a single family's interests left the town's infrastructure neglected and its outlying communities resentful. The eventual removal of the dominant faction came through legitimate election rather than conflict, but the resentments generated across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] took a further decade to subside.</p>"
  },
  {
    "name": "The Mapping of the Caverns",
    "content": "<p>A systematic effort funded by @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and led by @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.LaeQ5YYB5EmwfHHs] over two years produced the first comprehensive charts of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh]'s known passages. The published maps show a cavern system considerably less complex than the surveyors' private notes, which @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.LaeQ5YYB5EmwfHHs] kept sealed.</p>"
  },
  {
    "name": "The Iron Winter",
    "content": "<p>A winter of unprecedented severity locked @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] and surrounding regions under ice and snow for five consecutive months. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] froze solid for the first time in living memory. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] organized the only functional relief network that winter, earning goodwill that sustained the organization for a generation. The cold claimed eleven lives in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] alone.</p>"
  },
  {
    "name": "The Decade of Short Summers",
    "content": "<p>Ten consecutive years of shortened growing seasons across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] forced agricultural adaptation across the region. Hardier crops replaced traditional varieties. Orchards were abandoned. The population of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk]'s outlying farmsteads declined as families moved to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] for more reliable income, straining the town's housing and water systems.</p>"
  },
  {
    "name": "The Cult Suppression Campaign",
    "content": "<p>Following a series of incidents attributed to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc], the governing councils of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and three neighboring settlements coordinated a months-long campaign of surveillance, arrest warrants, and property seizure targeting the cult's known members. The campaign disrupted the Drowned Choir's visible operations significantly. Its underground operations, as later evidence suggested, continued uninterrupted throughout.</p>"
  },
  {
    "name": "The Great Cavern Excavation",
    "content": "<p>A mining consortium operating under license from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] spent three years aggressively expanding operations in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh], extracting significant quantities of copper and something the records describe only as dark mineral. The project was abruptly suspended following an incident on the two hundred and sixty-eighth day of operation that claimed six workers and left three others unable to describe what they had witnessed. The consortium dissolved the following spring.</p>"
  },
  {
    "name": "The Elysian Vale Road Commission",
    "content": "<p>A generation of infrastructure investment transformed the roads of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] from mud tracks into a network of maintained gravel routes connecting all major settlements to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]. The commission employed hundreds of workers across two decades. The road skirting @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] required the most labor per league of any section and was rebuilt three times in its first decade.</p>"
  },
  {
    "name": "The Lantern Circle and Harmonic Society Conflict",
    "content": "<p>A philosophical dispute between @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] and @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] over methods for countering @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] simmered for years before breaking into open rupture. Members of both organizations in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] stopped speaking to each other for the better part of two years, weakening both groups at a time when coordination would have been more useful than rivalry.</p>"
  },
  {
    "name": "The Slow Poisoning of the River",
    "content": "<p>Over the course of several seasons, fish began dying in sections of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC] downstream from the area nearest @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS]. Investigators traced the source to underground seepage from the marsh but could not explain why the seepage had begun. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.d2II8Wc9bAqhGVao] documented the progression in detail. The river fishery did not fully recover for eleven years.</p>"
  },
  {
    "name": "The Starlight Haven Census",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] conducted its first full census of the town and surrounding farmsteads, an undertaking that took six months and forty trained counters. The results revealed a population larger than any estimate had suggested, a significant proportion of residents who had arrived within the last decade, and a troubling number of people who could not or would not confirm their last known address.</p>"
  },
  {
    "name": "Eldergrove Marsh Absorbs a Settlement",
    "content": "<p>The village of Saltgrove, a small fishing community on the southern edge of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS], was gradually abandoned over five years as the marsh's edge crept closer each season. When travelers checked the site three years after the last residents departed, no trace of the buildings remained above the waterline. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] had been sighted near Saltgrove repeatedly during the years of its abandonment.</p>"
  },
  {
    "name": "The Eastward Expansion of Rolling Hills Settlement",
    "content": "<p>A wave of homesteading into the eastern reaches of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] over fifteen years doubled the region's cultivated acreage. Driven by land-hungry younger sons and families displaced from the vale, the expansion brought the settled frontier significantly closer to the known limits of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh]'s underground network — a proximity that would eventually matter.</p>"
  },
  {
    "name": "The Year the Cavern Road Closed",
    "content": "<p>The road to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh] was formally closed by order of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s council for the duration of a full year following a series of incidents that were not publicly described. Workers who had used the road daily refused to approach it even after the reopening. Cargo traffic took three additional years to return to prior levels.</p>"
  },
  {
    "name": "The Alliance of Four Settlements",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and three neighboring towns in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] formed a mutual defense compact after years of sporadic raiding from beyond the region's eastern border. The compact created a shared patrol system, a common signal network, and a fund for compensating attacked settlements. It remained active for a generation before slowly lapsing as the threat receded and political will eroded.</p>"
  },
  {
    "name": "Decades of Marsh Boundary Litigation",
    "content": "<p>A legal contest over the official boundary of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] occupied the courts of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] on and off for over thirty years. Landholders whose property was being consumed by the marsh's expansion sought compensation; the council disputed responsibility. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G2ndaf3B5Rp9ax4A] was called as a surveying witness in three separate proceedings. The litigation was never fully resolved — it was simply abandoned when the claimant families gave up and left.</p>"
  },
  {
    "name": "The Era of Open Enchantment Trade",
    "content": "<p>A progressive charter enacted by @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s council created a regulated market for enchanted goods throughout @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa]. Establishments like @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.cpCTOklrzZwY81RA] operated under formal license for the first time. The era lasted nearly two decades before the Enchantment Panic created political pressure to restrict trade again. Whether the panic was genuine or manufactured was debated long afterward.</p>"
  },
  {
    "name": "The Silent Years of the Harmonic Society",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] ceased all public performance for four years without announcement or explanation. Members were observed meeting privately across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] but gave no concerts and declined all requests. When they resumed, the music had changed in ways that observers found difficult to articulate — the same instruments, the same voices, but a quality that had not been present before.</p>"
  },
  {
    "name": "The Construction of the Rolling Hills Watchtowers",
    "content": "<p>Seven stone watchtowers were built across the high ground of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] over a period of three years, providing line-of-sight communication across the region. The tower closest to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] has been staffed by a two-person watch ever since, maintained at @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s expense, with no rotation staying longer than two weeks.</p>"
  },
  {
    "name": "The Empathy Alliance Schism",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] split over whether the alliance should assist those found to have connections to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc]. The majority held to the founding principle of no political questions asked. A significant minority left to form a stricter organization. The schism weakened both for years, to the quiet satisfaction of the cult, which had reportedly anticipated it.</p>"
  },
  {
    "name": "Starlight Haven's Market Rights Established",
    "content": "<p>After years of informal trading, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] was granted formal regional market rights, cementing its position as the commercial center of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa]. The granting process took three years of petitioning, two diplomatic missions, and the payment of a substantial fee. The rights brought revenue and prestige — and the attention of competitors who had previously been content to ignore the town.</p>"
  },
  {
    "name": "Two Decades Without a Name for the Marsh Shadow",
    "content": "<p>For nearly twenty years following the earliest recorded disappearances near @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS], the entity that would come to be called @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] had no agreed name or description. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s watch records simply noted: disturbance, marsh origin. The consolidation of accounts under a single name came only after an eyewitness encounter specific enough and credible enough to be taken seriously by the council.</p>"
  },
  {
    "name": "The Night Fires of Rolling Hills",
    "content": "<p>Over a period of several weeks, unexplained fires were observed burning in the high ridges of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.7koNDqI4NSG7Q2Zk] each night, in locations where no settlement existed. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] sent observers. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] declined to comment on whether they recognized the pattern. The fires stopped without explanation after thirty-seven nights.</p>"
  },
  {
    "name": "The Years of Unusual Trade",
    "content": "<p>For five consecutive years, goods of unknown origin appeared regularly in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s market — objects of fine craftsmanship, unusual materials, and no traceable source. Merchants who sold them could not name their suppliers consistently. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.cpCTOklrzZwY81RA] was involved in several of these transactions. The goods stopped appearing as abruptly as they had begun.</p>"
  },
  {
    "name": "The Drowned Choir Loses Its Leader",
    "content": "<p>The known leader of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] disappeared under unclear circumstances during a period of heightened pressure from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s watch. The cult did not publicize a successor. Within a year it became clear it was functioning more effectively than before, which suggested the leadership structure had not depended on a single person as authorities had assumed.</p>"
  },
  {
    "name": "The Cartographic Survey of Elysian Vale",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.LaeQ5YYB5EmwfHHs] led a two-year survey of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] that produced the region's first comprehensive and accurate atlas. The work resolved long-standing boundary disputes and established the accepted extent of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] at the time of publication — a boundary that subsequent surveys consistently found had grown since the last measurement.</p>"
  },
  {
    "name": "The Long Drought Peace",
    "content": "<p>The severe drought that gripped @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] for nearly eight months paradoxically produced an extended period of reduced conflict across the region, as the shared crisis required cooperation that politics alone could not motivate. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] later described this period as the organization's most effective in living memory, because people accepted help they would normally have refused.</p>"
  },
  {
    "name": "The Siege That Wasn't",
    "content": "<p>A force of armed men with a legitimate grievance against @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s council camped outside the town gates for nine days. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6] maintained the watch's posture throughout without provocation. Negotiators from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] met with the encampment leaders on five of those evenings. On the tenth morning the force was gone. The grievance was addressed in council the following month.</p>"
  },
  {
    "name": "Thorin Valharn Becomes Senior Guard",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6] was appointed to lead the watch of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] after serving for over a decade as a rank-and-file guard. The appointment was uncontroversial among the watchmen, who had long considered him the de facto authority regardless of his official rank. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.i5Opllw4sDNfBULu] described the council's delay in formalizing his position as baffling.</p>"
  },
  {
    "name": "Gideon Brightblade Joins the Watch",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.i5Opllw4sDNfBULu] presented himself to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6] a full year below the minimum age, tested above the required standard, and was accepted. He made himself so obviously indispensable within six months that the two council members who had objected quietly dropped the matter.</p>"
  },
  {
    "name": "Te'lahn Enchantments Opens",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.cpCTOklrzZwY81RA] opened in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] under its first proprietor, who had previously operated a smaller establishment two days' travel to the east. The move was attributed to the larger customer base. It was later noted that the previous location of the shop was within a mile of a documented @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] gathering site.</p>"
  },
  {
    "name": "Varian Darkthorn Is Hired and Fired",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.wL61oHJxEm0jBfvj] was engaged by a merchant house in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] as a private security contractor, proved extremely effective for eight months, and was then let go without explanation. He remained in the area working independently and was reportedly seen outside the merchant's premises on several subsequent evenings, watching.</p>"
  },
  {
    "name": "The Shimmering Shell's Best Year",
    "content": "<p>A combination of good harvests, the river festival, and an influx of travelers drawn by the regional trade compact made the year in question the highest-revenue in the history of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5hcUbY5glgtdqUpx]. The proprietor hired four additional staff and renovated the east wing. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.INUszSz7M3qrqNnH] was hired as a permanent member of that year's expanded staff.</p>"
  },
  {
    "name": "The Marsh Shadow Claims a Child",
    "content": "<p>A six-year-old disappeared from the edge of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] while playing near the fence line in clear daylight. Witnesses said they saw nothing move; the child was simply there and then was not. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] was listed in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6]'s report. The town's relationship with the marsh, already fearful, became something closer to open hostility after that day.</p>"
  },
  {
    "name": "Lyra Nightshade Refuses the Council's Offer",
    "content": "<p>The town council of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] offered @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.JX1CKzo45ehiaR73] a formal position as town physician with a salary, a building, and two assistants. She declined without extended discussion and continued operating her private practice on her own terms. The council made the offer twice more over subsequent years and received the same answer both times.</p>"
  },
  {
    "name": "Kaelith Stormrider Returns from the East",
    "content": "<p>After an absence of over a year, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.86i7jVgWz2zr5Jsu] returned to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] changed in ways those who knew him noticed immediately but found difficult to name. He sought out @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] within his first week back — a meeting he had never sought before. He did not discuss where he had been.</p>"
  },
  {
    "name": "Mirrathena Webweaver's Commission for the Watch",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.uTUaEGz8bBjkUyEn] was quietly commissioned by @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6] to produce a set of woven items — purpose undisclosed — for the guards of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] posted nearest @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS]. Those guards reported fewer incidents of disturbance at their posts in the following season than in any prior period on record.</p>"
  },
  {
    "name": "Elowen Farwind's School Graduates Its First Class",
    "content": "<p>The informal school that @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.0ibqI8ttjh0aa1iT] had been running from her front room in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s lower quarter for three years produced its first cohort of students who could read and calculate at a functional level. Nine of the twelve found employment above what their families had previously achieved. The school subsequently moved to a dedicated building paid for by a collection among the parents.</p>"
  },
  {
    "name": "Daelan Shadowhunter Takes a Long Contract",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.HzRlMqrpARPB1ANv] was absent from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] for the better part of a year on a contract whose terms and client were not disclosed. He was sighted three times during this period — once near @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh], once at the far edge of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa]'s western border — locations with no obvious common purpose.</p>"
  },
  {
    "name": "Elowen Thorne Maps the Marsh Deaths",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.d2II8Wc9bAqhGVao] spent over a year compiling records of every death, disappearance, and unexplained incident attributed to proximity to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] going back several decades. She produced a map showing a clear expansion pattern radiating from the marsh's deepest point. The council of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] filed it without public comment. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw] requested a copy the same week it was filed.</p>"
  },
  {
    "name": "Celestria Windrider Publishes Her Star Charts",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.otDnRZTdcda4DZeP] completed and published a set of star charts covering the region visible from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa], a project representing over four years of nightly observation. The charts were adopted immediately by navigators on @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC]. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G7vM0ExZwhlJEUI8] sent a private letter requesting access to the unpublished observation notes. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.otDnRZTdcda4DZeP] declined.</p>"
  },
  {
    "name": "Blackron Quill's Long Investment",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.xIV8OhpNk5MtglXI] quietly acquired partial interests in seven small businesses across @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] and the surrounding settlements of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] over four years, each stake too small to require council disclosure. Taken together the investments gave him access to information flowing through significant portions of the region's commercial network.</p>"
  },
  {
    "name": "Thalindra Moonshadow's Disappearance",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.INUszSz7M3qrqNnH] was absent from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5hcUbY5glgtdqUpx] and from @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] for forty-three days with no word. No one who knew her filed a missing-person report, as if each believed she had told the others where she had gone. When she returned she was thinner, had three new scars, and resumed her shift at the bar the following morning as though nothing had occurred.</p>"
  },
  {
    "name": "Fiona Duskwhisper's Long Investigation",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.ERjDdUqbQuYbrtGg] spent the better part of two years quietly investigating the connection between @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc] and individuals within @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s commercial and civic life. She shared nothing with the watch and nothing with @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.5yN9fUIcEjW22jJw]. She kept the results in a record known only to herself, added to it methodically, and waited for circumstances that have not yet arrived.</p>"
  },
  {
    "name": "Zaralith Thunderglow Settles in Elysian Vale",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.DIB80FFotmMSjE13] acquired a small property on the western edge of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] and stayed for the better part of two years — the longest she had remained in one place within living memory of anyone who knew her. She was seen regularly walking the paths closest to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS] at hours when no one else was about.</p>"
  },
  {
    "name": "Seraphina Frostvale Asks Too Many Questions",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.mrPXxL36fwooyut9] spent several months in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] conducting personal research — interviewing former members of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.nvRw89XTDNPdd5Uc], workers who had been in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh] during the great excavation, and people who had encountered @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.Cnyji53Z1XjsxOZz] directly. She compiled everything into a document and sent it to an unnamed recipient outside the region before departing.</p>"
  },
  {
    "name": "The Empathy Alliance Builds Its Hospice",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.juSeQzgoFCF399kM] raised funds and labor over fourteen months to convert a disused warehouse on the south side of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] into a proper hospice facility. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.JX1CKzo45ehiaR73] donated medicines and consultation throughout. The hospice opened three months behind schedule and within its first season was operating at capacity.</p>"
  },
  {
    "name": "Rufus and the Long Grain Standoff",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.OG6018jrolT5agZ3] organized a months-long informal boycott of three merchant houses in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] accused of systematic price manipulation. His coalition was made up entirely of the lower quarter and outlying farms. The merchant houses did not initially take the boycott seriously. By the fourth month they did. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.h2f4GgiHMSxDalN6] chose not to intervene, privately agreeing with @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.OG6018jrolT5agZ3]'s underlying position.</p>"
  },
  {
    "name": "Elowen Thistledown Runs for Council",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.wxkhHJXlbHHJm0Fp] stood for election to the town council of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38], a campaign lasting several months organized with the same meticulous energy she brought to every other undertaking. She lost by a narrow margin widely considered to have been influenced by merchant interests. She accepted the result, announced she would stand again, and was elected comfortably the following cycle.</p>"
  },
  {
    "name": "The Zyraxis Sightings",
    "content": "<p>Over the course of a single year, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.6WiO55gUiBZlWxm0] was credibly reported in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38], at the entrance to @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.UMjH52s2wcrUpZTh], along @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.TlIEveylff1SBbvC], and twice near @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.n3oRQHqvSkkmQwFS]'s northern edge. No single witness encountered the figure twice. The descriptions were consistent enough to confirm one individual but inconsistent enough that no artist's likeness could be agreed upon.</p>"
  },
  {
    "name": "Garrick Stonebreaker's Permanent Post",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.pHhEkVckIENFKEiH] stopped taking work that required travel and established himself permanently in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38], taking on whatever labor was offered locally. People who asked why he had settled here received different answers on different days — none obviously untrue and none the same twice. He has not left the region in several years.</p>"
  },
  {
    "name": "Terra Veil Refuses an Offer",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G2ndaf3B5Rp9ax4A] was approached by an envoy from a noble house outside the region offering a well-paid position as senior surveyor and land administrator. She declined. The envoy returned twice with improved terms. After the third refusal the noble house reportedly began sending agents into @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.WHdYFULM4JjiucOa] to gather the information @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.G2ndaf3B5Rp9ax4A] would have provided.</p>"
  },
  {
    "name": "Lyra Silverleaf Trains Through Winter",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.FwvvFtxK41EIYFfD] spent an entire winter in disciplined isolation, training from before dawn until dark every day in the fields outside @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]. She declined all social invitations for the season. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.pHhEkVckIENFKEiH] evaluated her progress twice and said only that she was faster than he remembered. She emerged from winter visibly changed and did not return to her prior habits.</p>"
  },
  {
    "name": "Elara Windwhisper and the Missing Year",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.lKXlWShR8C4wXARs] left @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] in early spring and did not return for twelve months. When she came back she had a traveling companion she introduced by first name only, who stayed for a week and left quietly. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.HzRlMqrpARPB1ANv] recognized the companion and said nothing about it to anyone except @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.i5Opllw4sDNfBULu].</p>"
  },
  {
    "name": "Varian Darkthorn Watches the Town",
    "content": "<p>Over a period of several months, @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.wL61oHJxEm0jBfvj] was observed by multiple residents of @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38] at odd hours and in locations that seemed chosen for their sight lines rather than any obvious purpose. He was polite when spoken to and explained nothing. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.i5Opllw4sDNfBULu] was informed and chose not to intervene, noting privately that whatever @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.wL61oHJxEm0jBfvj] was watching for was probably not the watch's enemy.</p>"
  },
  {
    "name": "Ronan Frostfang Makes Enemies in the Merchant Quarter",
    "content": "<p>@UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.mYJfkw2dpV5b4kDq] intervened publicly in a dispute between a creditor and a debtor family in @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.CYhWpNmbDIwYZA38]'s market district, taking the debtor's side with enough physical presence that the creditor backed down. @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.i5Opllw4sDNfBULu] reviewed the resulting complaint and declined to pursue charges. The creditor subsequently avoided any street or establishment where @UUID[Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.mYJfkw2dpV5b4kDq] might be present.</p>"
  }
];

/**
 * Generate a random integer between min and max (inclusive).
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


/**
 * Generate a random CalendariaDate between year ranges.
 * @param minYear - Minimum year
 * @param maxYear - Maximum year
 * @returns Random date
 */
const generateRandomDate = (minYear: number, maxYear: number): { year: number; month: number; day: number } => {
  return CalendarAdapter.absoluteToCalendaria(
    CalendarAdapter.calendariaToAbsolute({ year: minYear, month: 0, day: 1 }) + randomInt(0, (maxYear - minYear)*364)
  );
};

/**
 * Generate mock notes and create them in Calendaria.
 * Stores the function in global for manual invocation.
 * 
 * @param startYear - Minimum year for random dates
 * @param endYear - Maximum year for random dates
 * @param notesPerCategory - Number of notes to generate per category (default: 6)
 * @returns Promise resolving to array of created note IDs
 */
export const generateCalendariaNotes = async (
  startYear: number,
  endYear: number,
  notesPerCategory: number = 6
): Promise<string[]> => {
  const categories = CalendarAdapter.getCategories();
  if (!categories || categories.length === 0) {
    console.error('No categories available from Calendaria');
    return [];
  }

  const createdIds: string[] = [];

  for (const category of categories) {
    for (let i = 0; i < notesPerCategory; i++) {
      const startDate = generateRandomDate(startYear, endYear);
      const hasEndDate = Math.random() > 0.6;

      // Generate end date 1-30 days after start (for range events)
      let endDate: { year: number; month: number; day: number } | undefined;
      if (hasEndDate) {
        endDate = CalendarAdapter.absoluteToCalendaria(
          CalendarAdapter.calendariaToAbsolute({ ...startDate }) + randomInt(1, 2000)
        );
      }

      const noteNum = randomInt(0, noteData.length - 1);
      try {
        const note = await CALENDARIA.api.createNote({
          name: noteData[noteNum].name,
          content: noteData[noteNum].content,
          startDate,
          endDate: endDate || undefined,
          allDay: !hasEndDate,
          repeat: 'never',
          categories: [category.id],
          icon: category.icon,
          color: category.color,
          gmOnly: Math.random() > 0.85,
          openSheet: false,
        });

        createdIds.push(note.id);
      } catch (error) {
        console.error(`Failed to create note: ${name}`, error);
      }
    }
  }

  console.log(`Created ${createdIds.length} notes in Calendaria`);
  return createdIds;
};


// Store the generate function in global for manual invocation
(globalThis as Record<string, unknown>).generateCalendariaNotes = generateCalendariaNotes;
