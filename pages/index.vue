<script setup>
definePageMeta({
 colorMode: 'dark',
})
import { DOMParser } from 'xmldom'
import xpath from 'xpath'

import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'radix-vue'

import { Bell, CircleUser, Home, LineChart, Menu, Package, Package2, Search, ShoppingCart, Users } from 'lucide-vue-next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

import { Icon } from '@iconify/vue'
import { IconUser, IconKey, IconNetwork, IconSearch, IconAlertTriangle, IconCircleCheck, IconReload, IconExternalLink, IconDeviceTv, IconMessage } from '@tabler/icons-vue';

import { useStorage } from '@vueuse/core'

const storage = useStorage();

const colorMode = useColorMode()

let isLoading = ref(false)
let isLoadingDomainlist = ref(false)

const editUserdata = ref(false)

const defaultuserdata = {
    username: '',
    apikey: '',
    ip: '0.0.0.0'
  }

let ncuserdata = await useStorage('ncuserdata', defaultuserdata)

  let tldList = ref({})

  const domainList = ref({
    domains: []
  })

  const getTldlist = async () => {
    // console.info('getTldlist')

    const data = await useAsyncData(
    'list',
      () => $fetch('/api/tldlist', {
        method: 'POST',
          body: {
            url: `https://api.namecheap.com/xml.response?ApiUser=${ncuserdata.value.username}&ApiKey=${ncuserdata.value.apikey}&UserName=${ncuserdata.value.username}&Command=namecheap.domains.gettldlist&ClientIp=${ncuserdata.value.ip}`
          }
      })
    )

    tldList.value = data.data.value

  }
  

  let domainListPage = ref(1)
  const domainListPagesize = 100

  const getDomainList = async () => {

    if (tldList.value.length <= 0 || tldList.value.length === undefined) {
      // console.warn('tldList not ok')
      getTldlist()
    }

    isLoadingDomainlist.value = true

    const { data, error } = await useFetch('/api/getdomainlist', {
          method: 'POST',
          body: {
            url: `https://api.namecheap.com/xml.response?ApiUser=${ncuserdata.value.username}&ApiKey=${ncuserdata.value.apikey}&UserName=${ncuserdata.value.username}&Command=namecheap.domains.getList&ClientIp=${ncuserdata.value.ip}&PageSize=${domainListPagesize}&SortBy=NAME&Page=${domainListPage.value}`
          }
        })

  if (error.value) {
    console.error(error.value)
  }

  if (data) {
    editUserdata.value = false
  } else {
    isLoadingDomainlist.value = false
  }

    const parser = new DOMParser();
    const xmlDomainList = parser.parseFromString(data.value, "text/xml");

    // Use an XPath selector to find all <host> elements within the appropriate namespace
    const select = xpath.useNamespaces({"ns": "http://api.namecheap.com/xml.response"});

    const ncapierrors = select("//ns:Error", xmlDomainList);

    if (ncapierrors.length > 0) {
      editUserdata.value = true
      console.warn(ncapierrors)
      ncapierrors.forEach(error => {
        toast('Error', {
          description: error.textContent
        })
      })
    }

    
    // Select all <host> elements
    const domains = select("//ns:Domain", xmlDomainList);

    const paging_TotalItems = select("//ns:TotalItems", xmlDomainList)[0].textContent;
    const paging_CurrentPage = select("//ns:CurrentPage", xmlDomainList)[0].textContent;

    if (domainListPage.value === 1) {
      domainList.value.domains = []
    }

    if ((paging_TotalItems / (domainListPagesize * domainListPage.value)) > 1) {
      domainListPage.value++
      getDomainList()
    } else {
      domainListPage.value = 1
    }


    domains.forEach(tld => {
      const name = tld.getAttribute("Name");
      const isourdns = tld.getAttribute("IsOurDNS");
      domainList.value.domains.push({
        name: name,
        isourdns: isourdns
      })
    })

    isLoadingDomainlist.value = false

    txt.value = 'Click on one of your Domains to get its DNS-Zone'

} // getDomainList

onBeforeMount(() => {
  // Check if ncuserdata is correctly initialized
  if (!ncuserdata.value || Object.keys(ncuserdata.value).length === 0) {
    ncuserdata.value = defaultUserData
  }

  if (ncuserdata.value.username.length === 0) {
    editUserdata.value = true
  }

})

onMounted(() => {
  if (ncuserdata.value.username.length > 0 && ncuserdata.value.apikey.length > 0) {
    getTldlist()
    getDomainList()
  }
})



let splitresult = ref({ sld: null, tld: null })
let selectedDomain = ref({
  domain: null,
  isourdns: null
})

function splitHostname(hostname) {
    // Reverse sort TLDs to match longest TLDs first (e.g., .co.uk before .uk)
    
    tldList.value.sort((a, b) => b.length - a.length);
    
    // Iterate through the sorted TLDs
    for (let tld of tldList.value) {
        if (hostname.endsWith(tld)) {
            // Remove the TLD from the end of the hostname to find the SLD
            let sld = hostname.slice(0, -tld.length).replace(/\.$/, '');
            splitresult.value = { sld: sld, tld: tld }
            return { sld: sld, tld: tld };
        }
    }
    // If no TLD matches, return null
    selectedDomain.value = {
      domain: null,
      isourdns: null
    }
    return { sld: null, tld: null };
}

const zone = ref(null)
let txt = ref()
let warning = ref(true)

const getDnsZone = async (domain) => {

  console.info(domain.name, tldList.value.length)

  if (tldList.value.length <= 0 || tldList.value.length === undefined) {
    getTldlist()
  }

  isLoading.value = true

  editUserdata.value = false
  selectedDomain.value = domain

  if (domain.isourdns === 'true') {

  let result = splitHostname(domain.name);
  // console.log(`SLD: ${result.sld}, TLD: ${result.tld}`);

  
  let zonexml = await useAsyncData(
  'zone',
  () => $fetch('/api/dnszone', {
        method: 'POST',
        body: {
          url: `https://api.namecheap.com/xml.response?ApiUser=${ncuserdata.value.username}&ApiKey=${ncuserdata.value.apikey}&UserName=${ncuserdata.value.username}&Command=namecheap.domains.dns.getHosts&ClientIp=${ncuserdata.value.ip}&SLD=${splitresult.value.sld}&TLD=${splitresult.value.tld}`
        }
      })
  )

  zone.value = zonexml

  const xmlContent = zone.value.data

// Parse the XML content
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

// Use an XPath selector to find all <host> elements within the appropriate namespace
const select = xpath.useNamespaces({ "ns": "http://api.namecheap.com/xml.response" });

    const ncapierrors = select("//ns:Error", xmlDoc);

    if (ncapierrors.length > 0) {
      editUserdata.value = true
      console.warn(ncapierrors)
      ncapierrors.forEach(error => {
        toast('Error', {
          description: error.textContent
        })
      })
    }

// Select all <host> elements
const hostNodes = select("//ns:host", xmlDoc);

txt.value = []


// Iterate through each <host> element and extract its attributes
hostNodes.forEach(host => {
    // const hostId = host.getAttribute("HostId");
    const name = host.getAttribute("Name");
    const type = host.getAttribute("Type");
    const address = host.getAttribute("Address");
    const mxPref = host.getAttribute("MXPref");
    // const ttl = host.getAttribute("TTL");
    // const associatedAppTitle = host.getAttribute("AssociatedAppTitle");
    // const friendlyName = host.getAttribute("FriendlyName");
    // const isActive = host.getAttribute("IsActive");
    // const isDDNSEnabled = host.getAttribute("IsDDNSEnabled");

    txt.value.push(`${name} ${type} ${type === 'MX' ? mxPref : ''} ${address}`)
});

txt.value = txt.value.join('\n');

isLoading.value = false

} else {
  txt.value = `${domain.name} is not using Namecheap Nameservers`
  isLoading.value = false
}

}

const downloadTextFile = () => {
  // The string you want to save to the .txt file
  // const text = "This is the content of the file";

  // Create a blob from the string
  const blob = new Blob([txt.value], { type: "text/plain" });

  // Create a link element
  const link = document.createElement("a");

  // Set the URL of the link element to the blob URL
  link.href = URL.createObjectURL(blob);

  // Set the download attribute with a filename
  link.download = `${selectedDomain.value.name}-dnszone.txt`;

  // Append the link to the body (it will not be visible)
  document.body.appendChild(link);

  // Programmatically click the link to trigger the download
  link.click();

  // Remove the link from the document
  document.body.removeChild(link);
};

const ncuserdata_username = computed(() => {
  return ncuserdata.value.username.length > 0 ? 'border-green-500 text-green-500' : ''
})
const ncuserdata_apikey = computed(() => {
  return ncuserdata.value.apikey.length > 0 ? 'border-green-500 text-green-500' : ''
})

const ncuserdata_inserted = computed(() => {
  return (ncuserdata.value.username.length > 0 && ncuserdata.value.apikey.length > 0) ? true : false
})

let searchdomains = ref('')

const sortedDomains = computed(() => {
  return domainList.value.domains.filter((o) => {
    return o.name.toString().toLowerCase().includes(searchdomains.value.toLowerCase())
  })
})

const videoOpen = ref(false)
const sheetOpen = ref(false)

</script>

<template>
  <div class="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
    <div class="hidden border-r bg-muted/40 md:block">
      <div class="flex h-full max-h-screen flex-col gap-2">
        <div class="flex min-h-[60px] items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/" class="flex items-center gap-2 font-semibold">
            <span class="">NC DNS Exporter</span>
          </a>
        </div>

        <div class="w-full p-4">
          <form>
            <div class="relative">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search domains"
                class="w-full appearance-none bg-background pl-8 shadow-none"
                v-model="searchdomains"
              />
            </div>
          </form>
        </div>

        <div class="w-full p-2 pb-0 border-t border-t-white/10 grid justify-start" v-if="ncuserdata_username">
          <button @click="getDomainList()" class="grid grid-flow-col items-center gap-2 rounded-full text-white/70 h-[30px] px-4 text-[10px]
            hover:text-white/100"><IconReload size="16" />reload ({{domainList.domains.length}})</button>
        </div>

          <div v-if="isLoadingDomainlist" class="grid gap-4 content-start w-full p-4 rounded-lg">
            <Skeleton class="w-full h-[42px] rounded-lg" />
            <Skeleton class="w-full h-[42px] rounded-lg" />
            <Skeleton class="w-full h-[42px] rounded-lg" />
            <Skeleton class="w-full h-[42px] rounded-lg" />
            <Skeleton class="w-full h-[42px] rounded-lg" />
          </div>

        <ScrollAreaRoot
          class="overflow-hidden"
          style="--scrollbar-size: 10px"
          v-if="domainList.domains.length > 0 && !isLoadingDomainlist"
        >
          <ScrollAreaViewport class="w-full h-full">
            <div class="p-4 gap-3 grid">
              <div v-for="(item, index) in sortedDomains" :key="index">

                  <div class="p-3 px-5 bg-black/40 border border-white border-opacity-0 rounded-lg transition-all cursor-pointer
                  hover:bg-black/70"
                  :class="{'border-opacity-30': (item.name === selectedDomain.name)}" @click="isLoading = true, getDnsZone(item)">
                    <div class="text-xs grid grid-flow-col gap-4 justify-between items-center">{{item.name}}
                      <span>
                        <HoverCard>
                          <HoverCardTrigger><IconAlertTriangle size="19" class="text-orange-500" v-if="item.isourdns === 'false'" /></HoverCardTrigger>
                          <HoverCardContent class="text-xs">
                            {{item.name}} does not use Namecheap Nameservers
                          </HoverCardContent>
                        </HoverCard>
                      </span>
                    </div>
                  </div>

              </div>
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar
            class="flex rounded select-none touch-none p-0.5 bg-black/40 transition-colors ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
            orientation="vertical"
          >
            <ScrollAreaThumb
              class="flex-1 bg-black/50 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
            />
          </ScrollAreaScrollbar>
          <ScrollAreaScrollbar
            class="flex select-none touch-none p-0.5 bg-black transition-colors ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
            orientation="horizontal"
          >
            <ScrollAreaThumb
              class="flex-1 bg-white rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
            />
          </ScrollAreaScrollbar>
        </ScrollAreaRoot>

      </div>
    </div>
    <div class="flex flex-col">
      <header class="flex justify-end xs:justify-between h-14 items-center gap-4 border-b bg-muted/40 px-4 min-h-[60px] px-6 xs:px-4">

        <Sheet v-model:open="sheetOpen">
          <SheetTrigger as-child>
            <Button
              variant="outline"
              size="icon"
              class="shrink-0 md:hidden"
            >
              <Menu class="h-5 w-5" />
              <span class="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="flex flex-col h-screen overflow-auto p-0">

            <div class="w-full p-4 pt-12">
              <form>
                <div class="relative">
                  <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search domains"
                    class="w-full appearance-none bg-background pl-8 shadow-none"
                    v-model="searchdomains"
                  />
                </div>
              </form>
            </div>

            <div class="w-full p-2 pb-0 border-t border-t-white/10 grid justify-start" v-if="ncuserdata_username">
              <button @click="getDomainList()" class="grid grid-flow-col items-center gap-2 rounded-full text-white/70 h-[30px] px-4 text-[10px]
                hover:text-white/100"><IconReload size="16" />reload ({{domainList.domains.length}})</button>
            </div>

              <div v-if="isLoadingDomainlist" class="grid gap-4 content-start w-full p-4 rounded-lg">
                <Skeleton class="w-full h-[42px] rounded-lg" />
                <Skeleton class="w-full h-[42px] rounded-lg" />
                <Skeleton class="w-full h-[42px] rounded-lg" />
                <Skeleton class="w-full h-[42px] rounded-lg" />
                <Skeleton class="w-full h-[42px] rounded-lg" />
              </div>

            <div class="p-4 gap-3 grid">
              <div v-for="(item, index) in sortedDomains" :key="index">

                  <div class="p-3 px-5 bg-black/40 border border-white border-opacity-0 rounded-lg transition-all cursor-pointer
                  hover:bg-black/70"
                  :class="{'border-opacity-30': (item.name === selectedDomain.name)}" @click="isLoading = true, sheetOpen = false, getDnsZone(item)">
                    <div class="text-xs grid grid-flow-col gap-4 justify-between items-center">{{item.name}}
                      <span>
                        <HoverCard>
                          <HoverCardTrigger><IconAlertTriangle size="19" class="text-orange-500" v-if="item.isourdns === 'false'" /></HoverCardTrigger>
                          <HoverCardContent class="text-xs">
                            {{item.name}} does not use Namecheap Nameservers
                          </HoverCardContent>
                        </HoverCard>
                      </span>
                    </div>
                  </div>

              </div>
            </div>

          </SheetContent>
        </Sheet>

        <a href="https://insigh.to/b/namecheap-dns-exporter" target="new" class="mr-8 xs:mr-1"> <Badge class="grid grid-flow-col gap-2 items-center border border-sky-500 bg-transparent text-sky-500 h-[26px] text-[9px] cursor-pointer
              hover:bg-transparent hover:border-sky-400 hover:text-sky-400"><IconMessage size="16" />Feedback</Badge></a>

        <div class="grid grid-flow-col gap-4 items-center" v-if="ncuserdata_username">

          <div class="grid grid-flow-col gap-4" @click="editUserdata = true">
            <Badge class="grid grid-flow-col gap-2 items-center border border-red-500 bg-transparent text-red-500 h-[26px] text-[9px] cursor-pointer
              hover:bg-transparent"
              :class="ncuserdata_username"><IconCircleCheck size="16" />{{ncuserdata.username}}</Badge>
            <Badge class="grid grid-flow-col gap-2 items-center border border-red-500 bg-transparent text-red-500 h-[26px] text-[9px] cursor-pointer
              hover:bg-transparent"
              :class="ncuserdata_apikey"><IconCircleCheck size="16" />API Key</Badge>
          </div>
        </div>

      </header>
      <main class="grid gap-4 pr-6 p-8 pb-12 w-full h-full
        xs:p-4">

        <div v-if="!editUserdata" class="grid gap-4 grid-rows-[auto_1fr]">
          <div class="grid grid-flow-col justify-between" >
            <h3 class="font-semibold">
              DNS-Zone {{selectedDomain?.name}}
            </h3>
            <Badge @click="downloadTextFile" class="text-xs cursor-pointer" v-if="selectedDomain.isourdns === 'true'">Download as .txt</Badge>
          </div>

          <pre class="bg-black/40 text-white rounded-lg px-8 py-6 h-full w-full overflow-auto"
            :class="{'border border-orange-500': selectedDomain.isourdns === 'false'}" v-if="!isLoading">{{txt}}</pre>

          <div v-if="isLoading" class="grid gap-4 content-start bg-black/40 w-full p-6 rounded-lg">
            <Skeleton class="w-[100px] h-4 rounded-full" />
            <Skeleton class="w-[200px] h-4 rounded-full" />
            <Skeleton class="w-[200px] h-4 rounded-full" />
            <Skeleton class="w-[400px] h-4 rounded-full" />
            <Skeleton class="w-[200px] h-4 rounded-full" />
          </div>

        </div>

        <div class="flex flex-1 items-center justify-center rounded-lg border border-dashed h-full
          xs:p-4" v-if="editUserdata">
          <div class="grid justify-items-center gap-1 text-center">
            <h3 class="text-2xl font-bold tracking-tight">
              Please enter your details below to get access to the Namecheap API
            </h3>
            <div class="text-sm text-muted-foreground max-w-[640px]">
              Details are stored in your Browser, but the call to the Namecheap API has to be made through a server. Don´t worry, no credentials will be stored or logged. Feel free to remove the below mentioned IP if you don´t use this tool. <a href="https://www.namecheap.com/support/api/intro/" target="new" class="text-green-600 text-xs font-bold inline-grid grid-flow-col gap-1 hover:text-green-500 ml-4">Namecheap Docs <IconExternalLink size="14" /></a> <span @click="videoOpen = true" class="text-green-600 text-xs font-bold inline-grid grid-flow-col gap-1 cursor-pointer hover:text-green-500 ml-2">Get credentials video <IconDeviceTv size="14" /></span>
            </div>
            <div class="grid gap-4 mt-12 mb-6 min-w-[300px]">
              <div class="relative">
                <IconUser size="19" class="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Namecheap Username"
                  class="w-full appearance-none bg-background pl-8 shadow-none"
                  v-model="ncuserdata.username"
                />
              </div>
              <div class="relative">
                <IconKey size="19" class="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Namecheap API Key"
                  class="w-full appearance-none bg-background pl-8 shadow-none"
                  v-model="ncuserdata.apikey"
                />
              </div>
              <div class="relative">
                <IconKey size="19" class="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Namecheap API Key"
                  class="w-full appearance-none bg-background pl-8 shadow-none"
                  v-model="ncuserdata.ip"
                />
              </div>
              <div class="text-[10px]">You can get your IP from here: <a href="https://ipinfo.io/" target="new" class="text-green-600 hover:text-green-500">https://ipinfo.io/</a></div>
              <Button class="mt-6 w-full" @click="getDomainList()" :disabled="!ncuserdata_inserted">
                Check connection
              </Button>
            </div>
            
          </div>

          <Dialog v-model:open="videoOpen">
            <DialogContent class="max-w-[1000px]">
              <DialogHeader>Activate Namecheap API, get key and set IP</DialogHeader>
              <img src="/img/set-namecheap-credentials.gif">
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  </div>
  <Toaster />
</template>

<style scoped>
/* For WebKit browsers (Chrome, Safari) */
  pre::-webkit-scrollbar {
    width: 12px; /* Width of the scrollbar */
  }

  pre::-webkit-scrollbar-track {
    background: #222; /* Background of the scrollbar track */
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  pre::-webkit-scrollbar-thumb {
    background: #888; /* Color of the scrollbar thumb */
    border-radius: 6px; /* Rounded corners for the scrollbar thumb */
  }

  pre::-webkit-scrollbar-thumb:hover {
    background: #555; /* Color when hovered */
  }

  /* For Firefox */
  pre {
    scrollbar-width: thin; /* Thin scrollbar */
    scrollbar-color: #888 #222; /* Thumb and track colors */
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  /* For Edge, Internet Explorer */
  /* This is limited, only allows basic color changes */
  pre {
    -ms-overflow-style: -ms-autohiding-scrollbar; /* Auto-hiding scrollbar */
  }

  /* Example of Edge/IE specific style (basic colors) */
  pre::-ms-scrollbar {
    width: 12px;
  }

  pre::-ms-scrollbar-track {
    background: #222;
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  pre::-ms-scrollbar-thumb {
    background: #888;
    border-radius: 6px;
  }
</style>
