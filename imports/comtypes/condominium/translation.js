/* eslint-disable quotes, quote-props, comma-dangle */

export const CondominiumTranslation = {

  en:
  {
    "community": "condominum",
    "Join a community": "Join a condominum",
    "Create a community": "Create a condominum",
    "Community finder note": "If you create a new condominum, you will be its Administrator.",
    "Community finder text": ["Here you can see the condominums created in our system that receive new members. ",
       "If you find your condominum in the list and are not yet a member of the community, you can submit a request to join on the community page, which can be approved by the condominum's executives. ",
       "If your condominum is not already in your system, you can create it and invite your condominum mates to join."],

    "centralHeating": "Central heating",
    "ownHeating": "Own heating system",

    "schemaCommunities": {
      "_": {
        "label": "Condominum"
      },
      "name": {
        "label": "Name of Condominum",
        "placeholder": "(eg. Marina Gardens)"
      },
      "description": {
        "label": "Description",
        "placeholder": "(eg. The most colourful building in the street.)"
      },
      "avatar": {
        "label": "Image",
        "placeholder": "File link (eg. https://imgbb.com/pic.jpg)"
      },
      "zip": {
        "label": "Zip code",
        "placeholder": "(eg. 1089)"
      },
      "city": {
        "label": "City",
        "placeholder": "(eg. Budapest)"
      },
      "street": {
        "label": "Street",
        "placeholder": "(eg. Tulip street or Heros square)"
      },
      "number": {
        "label": "House number",
        "placeholder": "(eg. 101 or 25/B)"
      },
      "lot": {
        "label": "Lot number",
        "placeholder": "(eg. 29732/9)"
      },
      "parcelRefFormat": {
        "label": "Parcel ref format",
        "placeholder": "(eg. F/D means Floor/Door)"
      },
      "management": {
        "label": "Contact info of management",
        "placeholder": "(eg. office address, phone, opening hours)",
        "help": "You can set some some text here freely and it will be displayed for everybody, not just for the members of this community. You can provide contact information here for outsiders."
      },
      "taxNo": {
        "label": "Tax number",
        "placeholder": "(eg. international VAT number)",
        "help": "Not mandatory, but you can set this, if you'd like it to appear on invoices and bills."
      },
      "totalunits": {
        "label": "Total shares outstanding",
        "placeholder": "(eg. 10000)",
        "help": "If the value is fixed, provide it here. If you don't provide one, the system will calculate it by summing the parcels' units"
      },
      "registeredUnits": {
        "label": "Registered shares",
        "placeholder": "(eg. 10000)"
      },
      "settings": {
        "label": "Settings",
        "modules": {
          "label": "Modules activated",
          "options": {
            "forum": "Forum",
            "voting": "Decsion making",
            "maintenance": "Maintenance",
            "finances": "Finaces",
            "documents": "Documentstore"
          }
        },
        "joinable": {
          "label": "Accepts join requests",
          "help": "If you are not providing all parcel owner's data yourself, and you'd like them to be able to join the community, providing their own data, allow this option. Before approving a join request, you can still edit the submitted data.",
        },
        "language": {
          "label": "Language",
          "help": "The official language of the community. (Users receive their notifications translated to their own language.)"
        },
        "parcelRefFormat": {
          "label": "Parcel reference format",
          "placeholder": "(eg. bfdd)",
          "help": "If a format is supplied, then the building, floor, door data can be calculated from the parcel reference. For example bfdd means the first character is the building, the second is the floor, and the 3rd-4th is the door number, so B108 is used for building B, first floor, door 8."
        },
        "topicAgeDays": {
          "label": "Topic ageing days",
          "help": "Topics get automatically closed after this many days of inactivity."
        },
        "communalModeration": {
          "label": "Communal moderation",
          "help": "When a number of users flag a content, the content is moderated for the rest of the users as well. Enter the number of flags needed, or enter 0 to switch this functionality off."
        },
        "accountingMethod": {
          "label": "Accounting method",
          "help": "Depending on this, the accounting transactions are generated differently from bills and payments. Never change this setting during the fiscal year.",
          "options": {
            "accrual": "Accrual",
            "cash": "Cash"
          }
        },
        "subjectToVat": {
          "label": "Under VAT"
        },
        "paymentsWoStatement": {
          "label": "Payments can be registered without a bank statement"
        },
        "paymentsToBills": {
          "label": "Payments need to be reconciled to the bills",
          "options": {
            "customer": "Customers",
            "supplier": "Suppliers",
            "member": "Owners"
          }
        }
      }
    },
    "schemaParcels": {
      "_": {
        "label": "Place"
      },
      "category": {
        "label": "Kind of place",
        "options": {
          "@property": "Property",
          "@common": "Common area",
          "@group": "Group",
          "#tag": "Hashtag"
        }
      },
      "serial": {
        "label": "Serial",
        "placeholder": "(eg. 34)",
        "help": "The serial number of the property. An integer that grows, and lets you sort your list."
      },
      "ref": {
        "label": "Reference",
        "placeholder": "(eg. B405 or II/4)",
        "help": "An abritrary but unique reference within the community"
      },
      "leadRef": {
        "label": "Lead parcel",
        "placeholder": "(eg. K108)"
      },
      "code": {
        "label": "Accounting code",
        "placeholder": "(eg. @B for building B)",
        "help": "The accounting code can be anz unique character sequence. When codes share the same beginning sequence, they are sub-codes of that parent code. We recommend using using @ for physical location, and then follw with a convention like, bulding, floor, door. If you don't supply a code, the system will use '@'+Reference as the accounting code."
      },
      "units": {
        "label": "Voting share units",
        "placeholder": "(eg. 135)"
      },
      "building": {
        "label": "Building",
        "placeholder": "(eg. F)"
      },
      "floor": {
        "label": "Floor",
        "placeholder": "(eg. 4 or IV)"
      },
      "door": {
        "label": "Door",
        "placeholder": "24"
      },
      "type": {
        "label": "Type",
        "placeholder": "(eg. Apartment or Parking space)",
        "help": "We can create the parcel billings by type.",
          "flat": "Apartment",
          "parking": "Parking",
          "storage": "Storage",
          "cellar": "Cellar",
          "attic": "Attic",
          "shop": "Shop",
          "office": "Office",
          "other": "Other"
      },
      "group": {
        "label": "Group",
        "help": "Arbitrary tag to identify which group of parcels it belongs to. Can be used in parcel billings.",
        "placeholder": "(eg. HasWaterMeter)"
      },
      "lot": {
        "label": "Lot No.",
        "placeholder": "(eg. 293457/A/21)"
      },
      "location": {
        "label": "Location"
      },
      "area": {
        "label": "Area total(m2)",
        "placeholder": "(eg. 45)"
      },
      "area1": {
        "label": "Area 1/1 weighted(m2)",
        "help": "Base or net area",
        "placeholder": "(eg. 35)"
      },
      "area2": {
        "label": "Area 1/2 weighted(m2)",
        "help": "1/2 weighted area, eg. terrace or loggia",
        "placeholder": "(eg. 5)"
      },
      "area3": {
        "label": "Area 1/3 weighted(m2)",
        "help": "1/3 weighted area, eg. garden",
        "placeholder": "(eg. 12)"
      },
      "volume": {
        "label": "Volume (m3)",
        "placeholder": "(eg. 142)"
      },
      "occupants": {
        "label": "Occupants"
      },
      "freeFields": {
        "label": "Free fields",
        "$": {
          "key": {
            "label": "Field name",
            "placeholder": "(pl. Height)"
          },
          "value": {
            "label": "Field value",
            "placeholder": "(eg. 3.5m)"
          }
        }
      }
    }
  },

  hu:
  {
    "community": "Társasház",
    "Community finder": "Házkereső",
    "Join a community": "Csatlakozás egy házhoz",
    "Create a community": "Létrehozok egy házat",
    "Community finder note": "Ha létrehoz egy új társasházat, ön lesz az Adminisztrátor!",
    "Community finder text": ["Itt láthatja azokat a rendszerünkben létrehozott társasházakat, melyek fogadnak még új tagokat. ",
      "Ha megtalálja saját házát a listában és még nem tagja a közösségnek, a ház adatlapján csatlakozási kérelmet adhat be, melyet a ház vezetői hagyhatnak jóvá. ",
      "Ha a háza még nem található meg a rendszerben, akkor létrehozhatja azt és meghívhatja lakótársait is, hogy csatlakozzanak."],

    "Parcels of community": "A házhoz tartozó albetétek",
    "Community page": "Házlap",

    "centralHeating": "Központi fűtés",
    "ownHeating": "Saját fűtés",

    "ownership proportion": "tulajdoni hányad",

    "schemaCommunities": {
      "_": {
        "label": "Társasház"
      },
      "name": {
        "label": "Társasház neve",
        "placeholder": "(pl. Rózsakert lakópark vagy Kankalin u 45)"
      },
      "description": {
        "label": "Leírás",
        "placeholder": "(pl. Az utca legszínesebb háza.)"
      },
      "avatar": {
        "label": "Fénykép",
        "placeholder": "Link megadása (pl. https://imgbb.com/kajol-lak.jpg)"
      },
      "zip": {
        "label": "Irányító szám",
        "placeholder": "(pl. 1034)"
      },
      "city": {
        "label": "Város",
        "placeholder": "(pl. Budapest)"
      },
      "street": {
        "label": "Utca/közterület",
        "placeholder": "(pl. Kankalin u. vagy Zsigmond tér)"
      },
      "number": {
        "label": "Házszám",
        "placeholder": "(pl. 101 vagy 25/B)"
      },
      "lot": {
        "label": "Helyrajzi szám",
        "placeholder": "(pl. 29732/9)"
      },
      "parcelRefFormat": {
        "label": "Albetét azonosító formátuma",
        "placeholder": "(pl. F/D azt jelenti Emelet/Ajto)"
      },
      "totalunits": {
        "label": "Összes tulajdoni hányad",
        "placeholder": "(pl. 1000 vagy 9999)",
        "help": "Ha ez egy fix érték, itt megadhatja. Ha nem ad meg értéket, akkor automatikusan számolja a rendszer az albtetétek hányadainak összegzésével."
      },
      "registeredUnits": {
        "label": "Regisztrált albetétek hányada",
        "placeholder": "(eg. 10000)"
      },
      "management": {
        "label": "Közös képviselet elérhetősége",
        "placeholder": "(pl. iroda címe, telefonszáma, nyitvatartása)",
        "help": "Az itt megadott szabad szöveges információt mindenki láthatja, nem csak a tulajdonosok. Itt adhat meg külsősök számára elérhetőségeket."
      },
      "taxNo": {
        "label": "Adószám",
        "placeholder": "(pl. 123456-2-42)",
        "help": "Nem szükséges megadni, csak ha szeretné hogy a számlákon fel legyen tüntetve."
      },
      "settings": {
        "label": "Beállítások",
        "modules": {
          "label": "Modulok aktiválva",
          "options": {
            "forum": "Fórum",
            "voting": "Döntéshozás",
            "maintenance": "Üzemeltetés",
            "finances": "Pénzügyek",
            "documents": "Dokumentumtár"
          }
        },
        "joinable": {
          "label": "Csatlakozási kérelmeket fogad",
          "help": "Ha nem ön viszi fel az összes tulajdonosi adatot, hanem szeretné engedni hogy a tulajdonosok maguktól, adataik megadásával csatlakozzanak, akkor engedélyezze. A csatlakozási kérelemben megadott albetét adatokat ön tudja még módosítani, mielőtt jóváhagyja azokat."
        },
        "language": {
          "label": "Nyelv",
          "help": "A közösség hivatalos nyelve. (A felhasználók a számukra küldött értesítőket a saját nyelvükre lefordítva kapják meg.)"
        },
        "parcelRefFormat": {
          "label": "Albetét azonosító formátuma",
          "placeholder": "(pl bfdd)",
          "help": "Ha van megadva formátum, akkor az albetét azonosítóból automatikusan kinyerhetők az épület, emelet, ajtó adatok. A bfdd például at jelenti, az elso karakter az épület, a második az emelet, a harmadik-negyedik pedig az ajtó, azaz B108 jelölli a B épület első emelet 8-as lakást."
        },
        "topicAgeDays": {
          "label": "Témák elöregedése napokban",
          "help": "A témák automatikusan lezárulnak ennyi nap inaktivitás után."
        },
        "communalModeration": {
          "label": "Közösségi moderálás",
          "help": "Ha egy adott számú felhasználó kéretlennek jelöl meg egy tartalmat, akkor az a tartalom mindenki számára halkításra kerül. Adja meg azt a számot, ahány jelölés kell ehhez, vagy írjon be 0-t, ha ki szeretné kapcsolni ezt a funkciót."
        },
        "accountingMethod": {
          "label": "Könyvelési mód",
          "help": "A könyvelési mód - egyszeres (pénzforgalmi) vagy kettős - határozza meg mikor jönnek létre könyvelési tranzakciók a számlákból (befogadáskor vagy kifizetéskor). A könyvelési módot év közben semmiképpen nem szabad megváltoztatni.",
          "options": {
            "accrual": "Kettős könyvvitel",
            "cash": "Egyszeres (pénzforgalmi) könyvvitel"
          }
        },
        "subjectToVat": {
          "label": "ÁFA körben van"
        },
        "paymentsWoStatement": {
          "label": "Számla fizetése rögzíthető bankkivonat nélkül is"
        },
        "paymentsToBills": {
          "label": "Számla fizetéseket a számlákhoz kell egyeztetni",
          "options": {
            "customer": "Vevőknél",
            "supplier": "Szállítóknál",
            "member": "Tulajdonosoknál"
          }
        }
      }
    },
    "schemaParcels": {
      "_": {
        "label": "Hely"
      },
      "category": {
        "label": "Hely jellege",
        "options": {
          "@property": "Albetét",
          "@common": "Közös tulajdon",
          "@group": "Gyűjtő",
          "#tag": "Elszámolási egység"
        }
      },
      "serial": {
        "label": "Sorszám",
        "placeholder": "(pl. 34)",
        "help": "Egyedi sorszám, mely segít sorba rendezni a helyeinket. A helyrajzi szám utolsó száma például kíválóan alkalmas erre."
      },
      "ref": {
        "label": "Azonosító",
        "placeholder": "(pl. B405 vagy II/4)",
        "help": "Egyedi név, mellyel hivatkozni lehet erre a helyre"
      },
      "leadRef": {
        "label": "Vezető albetét",
        "placeholder": "(pl. K108)"
      },
      "code": {
        "label": "Könyvelési kód",
        "placeholder": "(pl. @B a B épülethez)",
        "help": "A könyvelési kód tetszőleges karakter sorozat lehet. Ha nem ad meg kódot, akkor a @+'Azonosítót' fogja használni a rendszer könyvelési kódnak. Amikor azonos karakterekkel kezdődik egy másik kód, akkor az az al-kódja a másik helynek, ezzel lehet hierarchiába rendezni a helyeinket. Érdemes ezért konvenciót használni, mint pl @ jelöli a fizikai helyeket, és ezt követheti az épület, az emelet majd az ajtó kódja."
      },
      "units": {
        "label": "Tulajdoni hányad",
        "placeholder": "(pl. 135)"
      },
      "building": {
        "label": "Épület",
        "placeholder": "(pl. K)"
      },
      "floor": {
        "label": "Emelet",
        "placeholder": "(pl. 4 vagy IV)"
      },
      "door": {
        "label": "Ajtó",
        "placeholder": "(pl. 24)"
      },
      "type": {
        "label": "Típus",
        "placeholder": "(pl. Lakás vagy Tároló)",
        "help": "A típus alapján is tudjuk az előírásokat elkészíteni.",
          "flat": "Lakás",
          "parking": "Parkoló",
          "storage": "Tároló",
          "cellar": "Pince",
          "attic": "Padlás",
          "shop": "Üzlet",
          "office": "Iroda",
          "other": "Egyéb"
      },
      "group": {
        "label": "Csoport",
        "help": "Tetszőleges szó, ami azonosítja melyik csoportba tartozik ez az albetét. Az előrásoknál lehet a csoport szerint szűrni.",
        "placeholder": "(pl. Vízórás)"
      },
      "lot": {
        "label": "Helyrajzi szám",
        "placeholder": "(pl. 293456/A/24)"
      },
      "location": {
        "label": "Elhelyezkedés"
      },
      "area": {
        "label": "Alapterület össz(m2)",
        "placeholder": "(pl. 45)"
      },
      "area1": {
        "label": "Alapterület 1/1 súlyú(m2)",
        "help": "Nettó vagy belső alapterület",
        "placeholder": "(pl. 35)"
      },
      "area2": {
        "label": "Alapterület 1/2 súlyú(m2)",
        "help": "1/2 súlyozott terület, pl. erkély vagy terasz",
        "placeholder": "(pl. 5)"
      },
      "area3": {
        "label": "Alapterület 1/3 súlyú(m2)",
        "help": "1/3 súlyozott terület, pl. kert",
        "placeholder": "(pl. 12)"
      },
      "volume": {
        "label": "Légköbméter (m3)",
        "placeholder": "(pl. 142)"
      },
      "occupants": {
        "label": "Birtokosok"
      },
      "freeFields": {
        "label": "Kötetlen mezők",
        "$": {
          "key": {
            "label": "Megnevezés",
            "placeholder": "(pl. Belmagasság)"
          },
          "value": {
            "label": "Érték",
            "placeholder": "(pl. 3,5m)"
          }
        }
      }
    }
  }
};
