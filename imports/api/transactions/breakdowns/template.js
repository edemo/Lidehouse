import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns.js';

export function defineBreakdownTemplates() {

  //if (Breakdowns.findOne({})) return;

//Kettős könyvelés verzió

  Breakdowns.define({ communityId: null,
    digit: '1', name: 'Befektetett Eszközök', locked: true, sign: +1,
    children: [
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '2', name: 'Készletek', locked: true, sign: +1,
    children: [
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '3', name: 'Assets', locked: true, sign: +1,  //KÖVETELÉSEK
    children: [
      { digit: '1', name: 'Tárgyi és immateriális',
        children: [
        { digit: '1', name: 'Vagyoni értékű jogok' },
        { digit: '2', name: 'Műszaki berendezések' },
        ],
      },
      { digit: '2', name: 'Money accounts',
        children: [
        { digit: '1', name: 'Folyószámla' },
        { digit: '2', name: 'Megtakarítási számla' },
        { digit: '3', name: 'Pénztár' },
        ],
      },
      { digit: '3', name: 'Owner obligations',
        include: 'Owner payin types',
      },
      { digit: '4', name: 'Hátralékok',
        children: [
        { digit: '1', name: 'Albetétek jelzáloggal nem terhelt hátraléka' },
        { digit: '2', name: 'Albetétek jelzáloggal terhelt hátraléka' },
        ],
      },
      { digit: '5', name: 'Egyéb követelések' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '4', name: 'Liabilities', locked: true, sign: -1,  // Források
    children: [
      { digit: '1', name: 'Equity', locked: true,
        children: [
            { digit: '9', name: 'Adózott eredmény' },
        ],
      },
      { digit: '3', name: 'Unidentified items',
        children: [
        { digit: '1', name: 'Unidentified incomes' },
        { digit: '2', name: 'Unidentified expenses' },
        ],
      },
      { digit: '4', name: 'Hitelek',
        children: [
        { digit: '1', name: 'Bank hitel' },
        { digit: '2', name: 'Egyéb hitel' },
        ],
      },
      { digit: '5', name: 'Szállítók' },
    ],
  });
  Breakdowns.define({ communityId: null,
    digit: '5', name: 'Költség nemek', locked: true, sign: +1,  // 5-ös számlaosztály kész
    children: [
        { digit: '1', name: 'ANYAGKÖLTSÉG',
       children: [
           { digit: '01', name: 'Víz díj' },
           { digit: '02', name: 'Áram díj' },
           { digit: '03', name: 'Gáz díj' },   
           { digit: '04', name: 'Irodai anyagok' },  
           { digit: '05', name: 'Karbantartási segédanyagok' },   
           { digit: '06', name: 'Égők,felszerelési anyagok' },   
           { digit: '07', name: 'Egyéb anyagok' },           
        ],
        },
        { digit: '2', name: 'SZOLGÁLTATÁSOK KÖLTSÉGEI',  
        children: [
           { digit: '01', name: 'Csatorna díjak' }, 
           { digit: '02', name: 'Szemét díjak' },
           { digit: '03', name: 'Takarítás' },
           { digit: '04', name: 'Kommunikációs költségek' },   
           { digit: '05', name: 'Könyvelési díj' },   
           { digit: '06', name: 'Közösképviselet díja' },
           { digit: '07', name: 'Jogi költségek' },        
           { digit: '08', name: 'Karbantartás' },  
           { digit: '09', name: 'Javítások' },  
           { digit: '10', name: 'Biztonsági költségek' },            
           { digit: '11', name: 'Tagdíjak' }, 
           { digit: '12', name: 'Kertészet' },         
           { digit: '13', name: 'Egyéb megbízási, vállalkozási díjak' },          
        ],              
        },
        { digit: '3', name: 'EGYÉB SZOLGÁLTATÁSOK KÖLTSÉGEI',
        children: [
           { digit: '1', name: 'Hatósági díjak' }, 
           { digit: '2', name: 'Pénzügyi  díjak' },
           { digit: '3', name: 'Biztosítási díjak' },   
        ],               
        }, 
        { digit: '4', name: 'BÉRKÖLTSÉG'},
        { digit: '5', name: 'SZEMÉLYI JELLEGŰ EGYÉB KÖLTSÉG' },     
        { digit: '6', name: 'BÉRJÁRULÉKOK' },   
        { digit: '7', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS' },     
        { digit: '9', name: 'KÖLTSÉGNEMEK ÁTVEZETÉSE' },

    ],
  });
          // itt tartok
  Breakdowns.define({ communityId: null,  //8-as számlaosztály  kész
    digit: '8', name: 'Expenses', locked: true, sign: +1, //Ráfordítások  
    children: [
      { digit: '1', name: 'ANYAGJELLEGŰ RÁFORDÍTÁSOK',
        children: [
         { digit: '01', name: 'Víz díj' },
         { digit: '02', name: 'Áram díj' },
         { digit: '03', name: 'Gáz díj' },   
         { digit: '04', name: 'Csatorna díjak' }, 
         { digit: '05', name: 'Szemét díjak' },       
         { digit: '06', name: 'Irodai anyagok' },  
         { digit: '07', name: 'Karbantartási segédanyagok' },   
         { digit: '08', name: 'Égők,felszerelési anyagok' },   
         { digit: '09', name: 'Egyéb anyagok' },  
         { digit: '10', name: 'Takarítás' },
         { digit: '11', name: 'Kommunikációs költségek' },   
         { digit: '12', name: 'Könyvelési díj' },   
         { digit: '13', name: 'Közösképviselet díja' },
         { digit: '14', name: 'Jogi költségek' },        
         { digit: '15', name: 'Karbantartás' },  
         { digit: '16', name: 'Javítások' },  
         { digit: '17', name: 'Biztonsági költségek' },            
         { digit: '18', name: 'Tagdíjak' }, 
         { digit: '19', name: 'Kertészet' },         
         { digit: '20', name: 'Egyéb megbízási, vállalkozási díjak' },       
         { digit: '21', name: 'Hatósági díjak' }, 
         { digit: '22', name: 'Biztosítási díjak' },   
         { digit: '23', name: 'Egyéb anyag jellegű ráfordítások' },
        ],
      },
      { digit: '2', name: 'SZEMÉLYI JELLEGŰ RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: ' Bérköltség' },
        { digit: '2', name: ' Személyi jellegű egyéb költség' },  
        { digit: '3', name: ' Bérjárulékok' },
        ],
      },
      { digit: '3', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS',
        children: [
        { digit: '1', name: 'Értékcsökkenési leírás' },
        ],
      },
      { digit: '6', name: 'EGYÉB RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: 'Adók és bírságok' },
        { digit: '2', name: 'Egyéb ráfordítás' },
        ],
      },    
      { digit: '7', name: 'PÉNZÜGYI RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: 'Kamat és bank költségek' },
        ],
      },      
       { digit: '9', name: 'EREDMÉNYT TERHELŐ ADÓK',
        children: [
        { digit: '1', name: 'Társasági adó' },
        ],
      },  
      
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '9', name: 'Incomes', locked: true, sign: -1,   // 9-es számlaosztály kész
    children: [
     { digit: '1', name: 'ÉRTÉKESÍTÉS ÁRBEVÉTELE',
        children: [
        { digit: '1', name: 'Bérleti díj bevételek' }, 
        { digit: '5', name: 'Egyéb adóköteles bevételek' },
        ],
      }, 
      
      { digit: '5', name: 'TUAJDONOSI BEFIZETÉSEK',
        children: [
        { digit: '1', name: 'Közös költség' }, 
        { digit: '2', name: 'Fogyasztás előírás',
          children: [
            { digit: '1', name: 'Hidegvíz előírás' },
            { digit: '2', name: 'Melegvíz előírás' },
            { digit: '3', name: 'Csatornadíj előírás' },
            { digit: '4', name: 'Fűtési díj előírás' },
            { digit: '5', name: 'Légkondícionáló előírás' },
            { digit: '6', name: 'Egyéb fogyasztás előírás' },  
        ],               
        },
        { digit: '3', name: 'Fejlesztési alap előírás' }, 
        { digit: '5', name: 'Egyéb előírás' },         
        { digit: '5', name: 'Rendkivüli befizetés előírás' },         
        ],
      },
      { digit: '6', name: 'EGYÉB BEVÉTELEK',
        children: [
        { digit: '6', name: 'Támogatások' },
        { digit: '7', name: 'Biztosítói kártérítés' },
        { digit: '8', name: 'Kártérítések' },
        { digit: '9', name: 'Különféle egyéb bevételek' },  
        ],
      },
     { digit: '7', name: 'PÉNZÜGYI MŰVELETEK BEVÉTELEI',
        children: [
        { digit: '3', name: 'Hitelintézettől kapott kamatok' }, 
        { digit: '4', name: 'Egyéb pénzügyi bevételek' },         
        ],
      },      
     { digit: '8', name: 'RENDKIVÜLI BEVÉTELEK',
      },       
      
      { digit: '5', name: 'Owner payins', locked: true, // a 'Tulajdonosi befizetések' ld fentebb ugyan ez
        include: 'Owner payin types',
      },
    ],
  });
  Breakdowns.define({ communityId: null,
    name: 'Owner payin types', locked: true,
    children: [
    { digit: '1', name: 'Közös költség ' },
    { digit: '2', name: 'Fogyasztás előírás' },
    { digit: '3', name: 'Fejlesztési alap előírás' },
    { digit: '4', name: 'Egyéb előírás' },
    { digit: '5', name: 'Rendkivüli befizetés előírás' },
    ],
  });
  
  Breakdowns.define({ communityId: null,
    name: 'COA', label: 'Chart Of Accounts',
    children: [
      { digit: '0', name: 'Opening' },// Technikai számlák
      { digit: '1', include: 'Befektetett Eszközök' },
      { digit: '2', include: 'Készletek' },
      { digit: '3', include: 'Assets' }, // követelések
      { digit: '4', include: 'Liabilities' }, // Források
      { digit: '5', include: 'Költség nemek' },
      { digit: '8', include: 'Expenses' }, // Ráfordítások
      { digit: '9', include: 'Incomes' }, //Bevételek
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '@', name: 'Parcels', children: [
      { digit: 'A', name: 'Main building' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '#', name: 'Places', children: [
      { digit: '0', name: 'Central' },
      { digit: '1', name: 'Garden' },
      { digit: '2', name: 'Heating system' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '', name: 'Localizer', label: 'Localizers',
    children: [
      { digit: '@', name: 'Parcels', include: 'Parcels',
      },
      { digit: '#', name: 'Places', include: 'Places',
      },
    ],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineBreakdownTemplates);
}
