import unicodedata, re, csv, sys, collections
sys.path.insert(0, sys.argv[1])
from liste import GRUPPI
# Tolti dopo revisione: parole comuni, nomi propri, cognomi diffusi, refusi
TOGLI = set("""
boss down eroina live line max office teams signal threads medium alice libero opera safari brave steam gemini prima conte
linear reale vittoria ria wise square hype sella intesa sanpaolo credito kraken ledger blockchain compass monster corona mars
dove magnum dash mac omega celine diesel kappa lotto fila vans gap mango obi expert oracle sap canon mini smart lotus seat
triumph continental total shell target universal delta spar ibis harley jaguar elle queen vera motta novi fabbri branca
strega limoncello bellavista beretta negroni citterio aia candy vortice coin deborah pupa wind tre giorgia elisa elodie
annalisa ultimo blanco madame raf eros gue dante verdi galileo michelangelo garibaldi musk trump sinner hamilton leclerc
schumacher senna ligabue celentano zucchero baglioni battisti venditti mengoni sorrentino draghi prodi renzi meloni belen
defilippi toto toro barca heat bulls warriors rangers celtic porto santos spurs dia dis consulta tar cup salute difesa
finanza fit fin fip pam penny sigma iper brico italo ant ail emergency mic mit ats alexa kindle android chrome windows
subito wish booking lastminute bolt zoom slack notion aruba claude mistral perplexity bumble hinge meta rally dakar olly
salmo nek jax bono drake adele elvis albano recarlo jannniksinner polizziapenitenziaria esteticaenergia liciolucio
gianninamorandi miccaellahunziker trump musk tinder
cattolica maestro finocchio pippo frozen ginevra ferretti negri
""".split())
def canon(s):
    s = unicodedata.normalize('NFKD', s.strip())
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'[\s._@+\'&-]', '', s)
ordine = {'system':0,'black':1,'gold':2}
righe = {}; conflitti = []
for tipo, cat, nota, esatti, contiene in GRUPPI:
    for regola, nomi in (('contiene', contiene), ('esatto', esatti)):
        for n in nomi:
            c = canon(n)
            if not c or c in TOGLI: continue
            assert re.fullmatch(r'[a-z0-9]+', c), (n, c)
            if len(c) < 3: continue  # sotto i 3 caratteri: già riservati dal codice
            nuova = dict(nome=c, tipo=tipo, regola=regola, categoria=cat, nota=nota)
            if c in righe:
                v = righe[c]
                if (ordine[tipo], regola!='contiene') < (ordine[v['tipo']], v['regola']!='contiene'):
                    conflitti.append((c, v['tipo']+'/'+v['categoria'], '→', tipo+'/'+cat)); righe[c] = nuova
                elif v['tipo'] != tipo or v['categoria'] != cat:
                    conflitti.append((c, tipo+'/'+cat, 'resta', v['tipo']+'/'+v['categoria']))
            else:
                righe[c] = nuova
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['nome','tipo','regola','categoria','nota']); w.writeheader()
    for r in sorted(righe.values(), key=lambda r:(ordine[r['tipo']], r['categoria'], r['regola'], r['nome'])): w.writerow(r)
print('totale', len(righe))
for k,v in sorted(collections.Counter((r['tipo'],r['categoria'],r['regola']) for r in righe.values()).items()): print(' ',k,v)
print('conflitti', len(conflitti)); [print('  ',*c) for c in conflitti]
