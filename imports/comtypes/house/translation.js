/* eslint-disable quotes, quote-props, comma-dangle */

export const HouseTranslation = {

  en:
  {
    "community": "building",
    "Join a community": "Join a building",
    "Create a community": "Create a building",
    "Community finder note": "If you create a new building, you will be its Administrator.",
    "Community finder text": ["Here you can see the houses created in our system that receive new members. ",
       "If you find your house in the list and are not yet a member of the community, you can submit a request to join on the house page, which can be approved by the house's executives. ",
       "If your house is not already in your system, you can create it and invite your housemates to join."],

    "flat": "Apartment",
    "parking": "Parking",
    "storage": "Storage",
    "cellar": "Cellar",
    "attic": "Attic",
    "shop": "Shop",
    "other": "Other",
    "centralHeating": "Central heating",
    "ownHeating": "Own heating system",

    "schemaCommunities": {
      "name": {
        "label": "Name of the Building",
        "placeholder": "(eg. Marina Gardens)"
      },
      "description": {
        "label": "Description",
        "placeholder": "(eg. The most colourful building in the street.)"
      },
      "avatar": {
        "label": "Image",
        "placeholder": "Can use existing link (eg. https://imgbb.com/pic.jpg)"
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
      "taxNumber": {
        "label": "Tax number",
        "placeholder": "(eg. international VAT number)",
        "help": "Not mandatory, but you can set this, if you'd like it to appear on invoices and bills."
      },
      "totalunits": {
        "label": "Total shares outstanding",
        "placeholder": "(eg. 10000)"
      },
      "settings": {
        "label": "Settings",
        "joinable": {
          "label": "Accepts join requests",
          "help": "If you are not providing all parcel owner's data yourself, and you'd like them to be able to join the community, providing their own data, allow this option. Before approving a join request, you can still edit the submitted data.",
        },
        "language": {
          "label": "Language",
          "help": "The official language of the community. (Users receive their notifications translated to their own language.)"
        },
        "currency": {
          "label": "Currency",
          "placeholder": "Ft",
          "help": "Symbol of the local currency. This will appear next to money amounts."
        },
        "accountingMethod": {
          "label": "Accounting method",
          "help": "Depending on this, the accounting transactions are generated differently from bills and payments. Never change this setting during the fiscal year.",
          "accrual": "Accrual",
          "cash": 'Cash'
        }
      },
      "bankAccounts": {
        "label": "Bank accounts",
        "$": {
          "name": {
            "label": "Name",
            "placeholder": "(eg. Savings account)"
          },
          "number": {
            "label": "Bank account number",
            "placeholder": "(eg 12345678-00000000-00000525)"
          },
          "protocol": {
            "label": "Synchronization protocol (if available)",
            "auto": "Automatic",
            "manual": "Manual"
          },
          "primary": {
            "label": "Primary"
          }
        }
      }
    },
    "schemaParcels": {
      "label": "Parcel",
      "serial": {
        "label": "Serial no.",
        "placeholder": "(eg. 34)"
      },
      "ref": {
        "label": "Parcel",
        "placeholder": "(eg. P114)"
      },
      "leadRef": {
        "label": "Lead parcel",
        "placeholder": "(eg. K108)"
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
        "placeholder": "(eg. Apartment)"
      },
      "lot": {
        "label": "Lot No.",
        "placeholder": "(eg. 293457/A/21)"
      },
      "location": {
        "label": "Location"
      },
      "area": {
        "label": "Area (m2)",
        "placeholder": "(eg. 45)"
      },
      "volume": {
        "label": "Volume (m3)",
        "placeholder": "(eg. 142)"
      },
      "habitants": {
        "label": "Number of habitants",
        "placeholder": "(eg. 3)"
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
    "community": "ház",
    "Community finder": "Házkereső",
    "Join a community": "Csatlakozás egy házhoz",
    "Create a community": "Létrehozok egy házat",
    "Community finder note": "Ha létrehoz egy új közösséget, ön lesz az Adminisztrátor!",
    "Community finder text": ["Itt láthatja azokat a rendszerünkben létrehozott házakat, melyek fogadnak még új tagokat. ",
      "Ha megtalálja saját házát a listában és még nem tagja a közösségnek, a ház adatlapján csatlakozási kérelmet adhat be, melyet a ház vezetői hagyhatnak jóvá. ",
      "Ha a háza még nem található meg a rendszerben, akkor létrehozhatja azt és meghívhatja lakótársait is, hogy csatlakozzanak."],

    "Parcels of community": "A házhoz tartozó albetétek",
    "Community page": "Házlap",

    "flat": "Lakás",
    "parking": "Parkoló",
    "storage": "Tároló",
    "cellar": "Pince",
    "attic": "Padlás",
    "shop": "Üzlet",
    "other": "Egyéb",
    "centralHeating": "Központi fűtés",
    "ownHeating": "Saját fűtés",

    "ownership proportion": "tulajdoni hányad",

    "schemaCommunities": {
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
        "placeholder": "(pl. 1000 vagy 9999)"
      },
      "management": {
        "label": "Közös képviselet elérhetősége",
        "placeholder": "(pl. iroda címe, telefonszáma, nyitvatartása)",
        "help": "Az itt megadott szabad szöveges információt mindenki láthatja, nem csak a tulajdonosok. Itt adhat meg külsősök számára elérhetőségeket."
      },
      "taxNumber": {
        "label": "Adószám",
        "placeholder": "(pl. 123456-2-42)",
        "help": "Nem szükséges megadni, csak ha szeretné hogy a számlákon fel legyen tüntetve."
      },
      "settings": {
        "label": "Beállítások",
        "joinable": {
          "label": "Csatlakozási kérelmeket fogad",
          "help": "Ha nem ön viszi fel az összes tulajdonosi adatot, hanem szeretné engedni hogy a tulajdonosok maguktól, adataik megadásával csatlakozzanak, akkor engedélyezze. A csatlakozási kérelemben megadott albetét adatokat ön tudja még módosítani, mielőtt jóváhagyja azokat."
        },
        "language": {
          "label": "Nyelv",
          "help": "A közösség hivatalos nyelve. (A felhasználók a számukra küldött értesítőket a saját nyelvükre lefordítva kapják meg.)"
        },
        "currency": {
          "label": "Pénznem",
          "placeholder": "Ft",
          "help": "A helyi valuta jele. A pénzösszegek mellett ez a szimbólum lesz feltüntetve."
        },
        "accountingMethod": {
          "label": "Könyvelési mód",
          "help": "A könyvelési mód - egyszeres (pénzforgalmi) vagy kettős - határozza meg mikor jönnek létre könyvelési tranzakciók a számlákból (befogadáskor vagy kifizetéskor). A könyvelési módot év közben semmiképpen nem szabad megváltoztatni.",
          "accrual": "Kettős könyvitel",
          "cash": "Egyszeres (pénzforgalmi) könyvitel"
        },
      },
      "bankAccounts": {
        "label": "Bank számlák",
        "$": {
          "name": {
            "label": "Elnevezése",
            "placeholder": "(pl. Megtakarítási számla)"
          },
          "number": {
            "label": "Bankszámlaszám",
            "placeholder": "(pl. 12345678-00000000-00000525)"
          },
          "protocol": {
            "label": "Szinkronizációs protokol a bankkal (ha van)",
            "auto": "Automatikus",
            "manual": "Manuális"
          },
          "primary": {
            "label": "Elsődleges"
          }
        }
      }
    },
    "schemaParcels": {
      "label": "Albetét",
      "serial": {
        "label": "Sorszám",
        "placeholder": "(pl. 34)"
      },
      "ref": {
        "label": "Albetét",
        "placeholder": "(pl. P114)"
      },
      "leadRef": {
        "label": "Vezető albetét",
        "placeholder": "(pl. K108)"
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
        "placeholder": "(pl. Lakás)"
      },
      "lot": {
        "label": "Helyrajzi szám",
        "placeholder": "(pl. 293456/A/24)"
      },
      "location": {
        "label": "Elhelyezkedés"
      },
      "area": {
        "label": "Alapterület (m2)",
        "placeholder": "(pl. 45)"
      },
      "volume": {
        "label": "Légköbméter (m3)",
        "placeholder": "(pl. 142)"
      },
      "habitants": {
        "label": "Lakók száma",
        "placeholder": "(pl. 3)"
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
