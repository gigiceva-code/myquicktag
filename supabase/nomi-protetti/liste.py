# Sorgente delle liste dei nomi protetti. Ogni gruppo: (tipo, categoria, nota, esatti, contiene)
# I nomi si scrivono "come vengono": lo script li porta in forma canonica.

GRUPPI = []
def g(tipo, categoria, nota, esatti, contiene=()):
    GRUPPI.append((tipo, categoria, nota, esatti.split(',') if isinstance(esatti, str) else esatti,
                   contiene.split(',') if isinstance(contiene, str) else contiene))

# ------------------------------------------------------------------ SISTEMA
g('system', 'sistema', 'serve al funzionamento del sito', """
admin,administrator,amministratore,amministrazione,root,superuser,sysadmin,system,sistema,webmaster,hostmaster,postmaster,
noreply,donotreply,mailer,daemon,server,localhost,host,api,apis,cdn,static,assets,media,uploads,files,download,downloads,
login,logout,signin,signout,signup,register,registrati,registrazione,accedi,accesso,esci,auth,oauth,sso,password,reset,
account,accounts,profilo,profile,profiles,settings,impostazioni,dashboard,pannello,console,config,configurazione,
billing,fatturazione,pagamento,checkout,carrello,cart,ordine,ordini,orders,abbonamento,subscription,piani,plans,pricing,prezzi,
status,stato,health,docs,documentazione,developer,developers,sviluppatori,beta,alpha,dev,staging,demo,
help,aiuto,faq,support,supporto,info,informazioni,contatti,contact,contacts,about,chisiamo,
privacy,cookie,cookies,terms,termini,condizioni,legal,legale,note,notelegali,gdpr,dmca,copyright,abuse,abusi,report,segnala,segnalazioni,
security,sicurezza,moderator,moderatore,mod,mods,staff,team,official,ufficiale,verified,verificato,
www,mail,email,ftp,smtp,imap,pop,dns,ssl,http,https,
null,undefined,none,nil,nan,true,false,test,testing,error,errore,404,500,
user,users,utente,utenti,guest,ospite,anonymous,anonimo,me,self,owner,proprietario,
home,index,main,default,new,nuovo,edit,modifica,u,tag,tags,qr,qrcode,nfc,card,
analytics,statistiche,pocket,celebration,quickpass,vetrina,pwa,app,manifest,icons,icon,favicon,robots,sitemap
""")

# ------------------------------------------------------------------ MYQUICKTAG E NOMI INGANNEVOLI
g('black', 'myquicktag', 'nessuno può spacciarsi per myquicktag', 'mqt,myqt,quicktag,myquick', 'myquicktag,quicktag')
g('black', 'ingannevole', 'nomi che imitano assistenza o verifiche (truffe)', """
assistenza,assistenzaclienti,servizioclienti,customerservice,customercare,customersupport,helpdesk,callcenter,numeroverde,
supportotecnico,techsupport,assistenzatecnica,verifica,verifiche,verification,verify,verificaaccount,verificaidentita,
sbloccaaccount,recuperoaccount,recuperapassword,accountrecovery,sicurezzaaccount,accountsecurity,
rimborso,rimborsi,refund,refunds,pagamenti,payments,payment,fatture,bollette,riscossione,multa,multe,
avvisi,avviso,notifiche,notifica,alert,alerts,comunicazioni,ufficialeitalia,officialitalia,
giveaway,omaggio,omaggi,vincita,vincite,haivinto,premio,premi,lotteria,concorso,
centroassistenza,ufficioreclami,reclami,amministrazionecondominio
""")

# ------------------------------------------------------------------ ISTITUZIONI ED ENTI
g('black', 'istituzione', 'istituzioni e servizi pubblici (anti-truffa)', """
governo,governoitaliano,palazzochigi,presidenzadelconsiglio,presidenzadellarepubblica,quirinale,presidentedellarepubblica,
parlamento,senato,senatodellarepubblica,cameradeideputati,montecitorio,palazzomadama,cortecostituzionale,consulta,
csm,cortedeiconti,consigliodistato,tar,cassazione,cortedicassazione,tribunale,procura,magistratura,
ministero,ministeri,ministerodellinterno,viminale,ministerodellasalute,ministerodelleconomia,mef,ministerodellagiustizia,
ministerodelladifesa,difesa,ministerodegliesteri,farnesina,ministerodellistruzione,mim,miur,mur,ministerodellavoro,
ministerodellambiente,mase,mit,mimit,masaf,ministerodellacultura,mic,ministerodelturismo,
agenziaentrate,agenziadelleentrate,agenziaentrateriscossione,ader,equitalia,agenziadogane,agenziadoganemonopoli,adm,
inps,inail,istat,aci,pra,motorizzazione,motorizzazionecivile,portaleautomobilista,ivass,consob,covip,agcom,agcm,antitrust,
garanteprivacy,garanteperlaprivacy,anac,arera,enac,enav,anas,rfi,aifa,iss,istitutosuperioredisanita,agid,
pagopa,spid,cie,cartaidentita,cartadidentita,appio,ioapp,fascicolosanitario,tesserasanitaria,cup,asl,ats,aslroma,
sanita,servizionazionale,ssn,salute,protezionecivile,vigilidelfuoco,vigilidifuoco,pompieri,
polizia,poliziadistato,poliziapostale,poliziamunicipale,polizialocale,carabinieri,armadeicarabinieri,
guardiadifinanza,gdf,finanza,esercito,esercitoitaliano,marinamilitare,aeronauticamilitare,guardiacostiera,capitaneria,
polizziapenitenziaria,poliziapenitenziaria,dia,dis,aisi,aise,interpol,europol,fbi,cia,nsa,
112,113,115,118,1500,
poste,posteitaliane,poste_italiane,bancoposta,postepay,postemobile,
comune,comunedi,regione,provincia,prefettura,questura,
unioneeuropea,ue,eu,commissioneeuropea,europeancommission,parlamentoeuropeo,europeanparliament,consiglioeuropeo,
bce,ecb,bancacentraleeuropea,fmi,imf,bancamondiale,worldbank,onu,un,unitednations,nazioniunite,nato,otan,
oms,who,unesco,unicef,unhcr,fao,wfp,ocse,oecd,wto,
vaticano,santasede,vatican,cittadelvaticano,
crocerossa,crocerossaitaliana,redcross,caritas,emergency,medicisenzafrontiere,msf,savethechildren,amnesty,
amnestyinternational,greenpeace,wwf,telethon,airc,lilt,actionaid,unicefitalia,ail,ant,
coni,cip,figc,cio,ioc
""", """
agenziaentrate,agenziadelleentrate,guardiadifinanza,poliziadistato,carabinieri,posteitaliane,bancoposta,postepay,
protezionecivile,vigilidelfuoco,presidenzadelconsiglio,cameradeideputati,motorizzazione,inps,inail,quirinale,crocerossa
""")

# ------------------------------------------------------------------ BANCHE, PAGAMENTI, ASSICURAZIONI, CRYPTO
g('black', 'banca', 'banche e pagamenti (anti-truffa)', """
banca,banche,bank,bancaditalia,bankitalia,
intesasanpaolo,intesa,sanpaolo,unicredit,bancobpm,bpm,bper,bperbanca,montepaschi,mps,bancamps,montedeipaschi,
credem,bnl,bnlbnpparibas,bnpparibas,creditagricole,creditagricoleitalia,bancamediolanum,mediolanum,fineco,finecobank,
chebanca,widiba,ing,ingitalia,webank,bancasella,sella,bancoditesoro,mediobanca,bancaifis,ifis,bancagenerali,
bancafideuram,fideuram,allfunds,deutschebank,bancadeutsche,popolaredisondrio,bancapopolaredisondrio,
bancadesio,bancoazzurro,credito,creditoemiliano,cartabcc,bcc,iccrea,cassacentrale,raiffeisen,volksbank,
bancaprogetto,illimity,bancaprofilo,bancalavoro,cassadepositieprestiti,cdp,findomestic,agos,compass,cofidis,
santander,santanderconsumer,hsbc,barclays,jpmorgan,jpmorganchase,goldmansachs,morganstanley,citibank,citi,
bankofamerica,wellsfargo,ubs,creditsuisse,bbva,societegenerale,lloyds,natwest,
paypal,satispay,nexi,bancomat,bancomatpay,pagobancomat,postepayevolution,hype,revolut,n26,bunq,wise,transferwise,
stripe,klarna,scalapay,afterpay,sumup,square,applepay,googlepay,samsungpay,amazonpay,
visa,mastercard,maestro,americanexpress,amex,dinersclub,westernunion,moneygram,ria,
binance,coinbase,cryptocom,bitpanda,youngplatform,kraken,bybit,okx,kucoin,bitfinex,blockchain,metamask,ledger,trezor,
generali,assicurazionigenerali,unipol,unipolsai,allianz,axa,zurich,reale,realemutua,cattolica,groupama,vittoria,
poste vita,postevita,genertel,linear,prima,primaassicurazioni,verti,conte,conteit,directline,quixa,
telepass,unipolmove,mooney,lottomatica,sisal,snai
""", """
intesasanpaolo,unicredit,paypal,satispay,postepay,bancaditalia,mediolanum,finecobank,montepaschi,bancomat,
mastercard,americanexpress,westernunion,moneygram,binance,coinbase,telepass
""")

# ------------------------------------------------------------------ PIATTAFORME DIGITALI
g('gold', 'piattaforma', 'piattaforme digitali e social', """
google,gmail,youtube,googlemaps,android,chrome,gemini,googleplay,playstore,
apple,iphone,ipad,icloud,appstore,applemusic,appletv,macbook,
microsoft,windows,outlook,hotmail,live,office,office365,microsoft365,teams,skype,xbox,bing,linkedin,github,copilot,
meta,facebook,instagram,whatsapp,messenger,threads,oculus,
tiktok,bytedance,capcut,snapchat,pinterest,reddit,tumblr,twitter,x,xcorp,discord,twitch,telegram,signal,wechat,line,viber,
bereal,mastodon,bluesky,vk,onlyfans,patreon,substack,medium,quora,
amazon,amazonprime,primevideo,alexa,kindle,aws,audible,
netflix,disneyplus,disney+,spotify,applemusic,deezer,tidal,soundcloud,shazam,dazn,nowtv,skygo,raiplay,mediasetinfinity,
paramountplus,hbomax,max,crunchyroll,timvision,infinity,
ebay,aliexpress,alibaba,temu,shein,wish,etsy,vinted,subito,subitoit,zalando,asos,wallapop,
booking,bookingcom,airbnb,expedia,tripadvisor,trivago,skyscanner,edreams,lastminute,ryanair,easyjet,
uber,ubereats,lyft,bolt,freenow,glovo,deliveroo,justeat,thefork,tannico,
zoom,slack,dropbox,notion,canva,figma,adobe,photoshop,wordpress,wix,shopify,squarespace,godaddy,aruba,register,
openai,chatgpt,gpt,claude,anthropic,midjourney,perplexity,deepseek,mistral,huggingface,nvidia,
tinder,bumble,hinge,meetic,grindr,badoo,happn,
duolingo,babbel,coursera,udemy,
yahoo,yahoomail,libero,liberomail,virgilio,tiscali,alice,aliceit,
wikipedia,wikimedia,mozilla,firefox,opera,safari,brave,
playstation,nintendo,steam,epicgames,fortnite,minecraft,roblox,valorant,leagueoflegends,callofduty,fifa,eafc,
truecaller,waze,strava,
"""+"", """
instagram,facebook,whatsapp,tiktok,youtube,netflix,spotify,linkedin,snapchat,pinterest,onlyfans,chatgpt,openai,
microsoft,google,amazonprime,disneyplus,aliexpress,tripadvisor,airbnb,deliveroo,ubereats,justeat,playstation
""")

# ------------------------------------------------------------------ BRAND INTERNAZIONALI
g('gold', 'brand', 'marchio internazionale', """
cocacola,coke,pepsi,pepsico,fanta,sprite,redbull,monster,schweppes,nestle,nespresso,nescafe,kitkat,starbucks,mcdonalds,
mcdonald,burgerking,kfc,dominos,pizzahut,subway,dunkin,heineken,carlsberg,budweiser,corona,guinness,stellaartois,
beck's,becks,jackdaniels,johnniewalker,smirnoff,absolut,bacardi,jagermeister,moet,dompérignon,domperignon,veuveclicquot,
hennessy,chivas,baileys,
danone,activia,kellogg,kelloggs,oreo,milka,toblerone,lindt,haribo,mms,snickers,twix,mars,nutella,pringles,lays,doritos,
unilever,dove,lipton,knorr,magnum,algida,heinz,kraft,
procterandgamble,pampers,gillette,oralb,pantene,headandshoulders,dash,ariel,lenor,
loreal,lorealparis,maybelline,lancome,garnier,nivea,sephora,douglas,esteelauder,clinique,mac,maccosmetics,
chanel,dior,louisvuitton,lv,hermes,gucci,prada,cartier,tiffany,rolex,omega,tagheuer,patekphilippe,audemarspiguet,
swatch,hublot,breitling,longines,tissot,burberry,balenciaga,givenchy,ysl,saintlaurent,celine,loewe,bottegaveneta,
versace,armani,giorgioarmani,emporioarmani,dolcegabbana,dolceegabbana,fendi,moncler,valentinogaravani,
calvinklein,tommyhilfiger,ralphlauren,lacoste,hugoboss,levis,wrangler,diesel,
nike,adidas,puma,reebok,newbalance,asics,underarmour,thenorthface,northface,patagonia,columbia,salomon,timberland,
vans,converse,fila,kappa,umbro,lotto,diadora,
zara,bershka,pullandbear,stradivarius,massimodutti,inditex,hm,handm,uniqlo,primark,gap,mango,decathlon,
ikea,leroymerlin,obi,bricocenter,mediamarkt,mediaworld,unieuro,euronics,expert,trony,
samsung,sony,lg,panasonic,philips,huawei,xiaomi,oppo,oneplus,realme,motorola,nokia,lenovo,dell,hp,asus,acer,
intel,amd,qualcomm,ibm,oracle,sap,cisco,salesforce,tesla,spacex,starlink,
canon,nikon,fujifilm,gopro,dji,bose,jbl,beats,sennheiser,marshall,dyson,braun,bosch,siemens,miele,whirlpool,electrolux,
toyota,honda,nissan,mazda,suzuki,mitsubishi,subaru,lexus,hyundai,kia,volkswagen,vw,audi,bmw,mercedes,mercedesbenz,
porsche,opel,ford,chevrolet,cadillac,jeep,dodge,chrysler,renault,peugeot,citroen,dacia,skoda,seat,cupra,volvo,
landrover,rangerover,jaguar,bentley,rollsroyce,astonmartin,mclaren,bugatti,lotus,mini,smart,polestar,byd,
harleydavidson,harley,kawasaki,yamaha,ktm,triumph,
michelin,bridgestone,goodyear,continental,shell,esso,bp,totalenergies,total,q8,ip,tamoil,
dhl,ups,fedex,tnt,gls,brt,bartolini,sda,
visa,mastercard,
lego,mattel,hasbro,barbie,hotwheels,playmobil,
disney,pixar,marvel,dccomics,warnerbros,universal,paramount,hbo,sonypictures,dreamworks,lucasfilm,
cnn,bbc,foxnews,nytimes,newyorktimes,washingtonpost,forbes,bloomberg,reuters,theeconomist,financialtimes,vogue,
gq,elle,cosmopolitan,vanityfair,nationalgeographic,
emirates,qatarairways,lufthansa,britishairways,airfrance,klm,wizzair,vueling,iberia,turkishairlines,delta,
hilton,marriott,sheraton,hyatt,accor,ibis,novotel,radisson,fourseasons,ritzcarlton,bestwestern,
hertz,avis,europcar,sixt,
walmart,costco,target,carrefour,auchan,lidl,aldi,spar,despar,kaufland,
mercedesamg,amg,ferrarif1
""")

# ------------------------------------------------------------------ BRAND ITALIANI
g('gold', 'brand', 'marchio italiano', """
ferrari,lamborghini,maserati,alfaromeo,fiat,lancia,abarth,ducati,piaggio,vespa,aprilia,motoguzzi,mvagusta,benelli,
pirelli,brembo,stellantis,iveco,ferretti,azimut,rivayachts,sanlorenzo,
barilla,ferrero,kinder,raffaello,tictac,lavazza,illy,illycaffe,kimbo,segafredo,borbone,caffeborbone,pellini,
peroni,birramoretti,menabrea,ichnusa,campari,aperol,martiniandrossi,disaronno,amarettodisaronno,montenegro,
amaromontenegro,averna,ramazzotti,fernetbranca,branca,strega,limoncello,bellavista,ferrarispumante,
sanpellegrino,acquapanna,ferrarelle,levissima,uliveto,rocchetta,sanbenedetto,lete,vera,
galbani,parmalat,granarolo,mulinobianco,pavesi,gocciole,divella,dececco,garofalo,lamolisana,voiello,rummo,
giovannirana,pastarana,buitoni,saclà,sacla,mutti,cirio,starbene,findus,orogel,amadori,aia,fileni,rovagnati,
beretta,citterio,negroni,parmacotto,grandapadano,parmigianoreggiano,prosciuttodiparma,
bauli,balocco,loacker,perugina,bacioperugina,baciperugina,novi,venchi,caffarel,pernigotti,fabbri,amarena fabbri,
algida,sammontana,motta,alemagna,yomo,muller,
bialetti,smeg,delonghi,ariston,indesit,candy,hoover,vortice,imetec,kartell,alessi,lagostina,
benetton,unitedcolorsofbenetton,sisley,gucci,prada,miumiu,armani,versace,fendi,moncler,missoni,ferragamo,
salvatoreferragamo,bulgari,bvlgari,dolcegabbana,maxmara,marella,pennyblack,tods,hogan,geox,calzedonia,intimissimi,
tezenis,falconeri,yamamay,carpisa,goldenpoint,ovs,upim,coin,rinascente,lafeltrinelli,feltrinelli,mondadori,
stroili,pandora,pomellato,damiani,buccellati,morellato,sectorno,breil,luxottica,rayban,oakley,persol,safilo,
kiko,kikomilano,collistar,deborah,pupa,wycon,acquadiparma,
diadora,kappa,lotto,fila,superga,napapijri,colmar,refrigiwear,ciesse,stoneisland,cpcompany,paulandshark,
eni,enel,enelenergia,snam,terna,a2a,hera,iren,acea,edison,sorgenia,plenitude,eniplenitude,
tim,telecomitalia,vodafone,windtre,wind,tre,iliad,fastweb,kena,verymobile,hometv,ho,coopvoce,
rai,raiuno,raidue,raitre,rainews,mediaset,canale5,italia1,rete4,la7,sky,skyitalia,skytg24,tgcom24,
corriere,corrieredellasera,repubblica,larepubblica,lastampa,ilsole24ore,sole24ore,gazzetta,gazzettadellosport,
corrieredellosport,tuttosport,ilfattoquotidiano,ilgiornale,ilmessaggero,avvenire,ansa,fanpage,ilpost,
trenitalia,frecciarossa,italotreno,italo,itaairways,alitalia,autostrade,autostradeperlitalia,atm,atac,gtt,
esselunga,conad,coop,coopitalia,pam,eurospin,md,penny,crai,sigma,carrefouritalia,iper,ipercoop,bennet,famila,
tigota,acqua e sapone,acquaesapone,risparmiocasa,brico,brico io,bricoio,unieuro,expert,
generali,unipol,mediolanum,
leonardocompany,fincantieri,saipem,prysmian,atlantia,mundys,finmeccanica,
autogrill,eataly,rossopomodoro,spontini,oldwildwest,roadhouse,ciaocafe,
lottomatica,sisal,snai,eurobet,goldbet,
juventusstadium,allianzstadium,sansiro,
fiorucci,mariofiorucci,emiliopucci,robertocavalli,trussardi,moschino,etro,brunellocucinelli,zegna,ermenegildozegna,
kiton,brioni,canali,boggi,borsalino,golden goose,goldengoose,premiata,
vespaitalia,lamborghinitrattori,sametdeutzfahr,newholland,
nutella,ferrerorocher,pocket coffee,pocketcoffee,estathe,
peroni,nastroazzurro
""")

# ------------------------------------------------------------------ SPORT
g('gold', 'sport', 'squadre, competizioni e organizzazioni sportive', """
juventus,juve,juventusfc,inter,fcinter,intermilano,internazionale,acmilan,milanac,sscnapoli,napolicalcio,asroma,romacalcio,
sslazio,laziocalcio,atalanta,acffiorentina,fiorentina,torinofc,toro,bolognafc,genoacfc,genoa,sampdoria,udinese,sassuolo,
empoli,cagliaricalcio,hellasverona,uslecce,leccecalcio,acmonza,parmacalcio,como1907,veneziafc,cremonese,salernitana,
frosinonecalcio,spezia,spal,pisa,palermofc,bari1908,sscbari,brescia,catanzaro,reggiana,modenafc,sudtirol,cittadella,
ternana,avellino,triestina,perugia,ascoli,
realmadrid,fcbarcelona,barca,atleticomadrid,manchesterunited,manutd,manchestercity,mancity,liverpoolfc,chelseafc,
arsenalfc,tottenham,spurs,bayern,bayernmunchen,borussiadortmund,bvb,psg,parissaintgermain,ajax,benfica,porto,
celtic,rangers,galatasaray,fenerbahce,bocajuniors,riverplate,santos,flamengo,alnassr,interMiami,intermiami,
lakers,lalakers,celtics,bulls,chicagobulls,warriors,goldenstatewarriors,heat,miamiheat,knicks,
seriea,serieb,seriec,legaseriea,coppaitalia,supercoppa,supercoppaitaliana,championsleague,uefachampionsleague,
europaleague,conferenceleague,premierleague,laliga,bundesliga,ligue1,eredivisie,mls,
uefa,fifa,figc,coni,cio,olympics,olimpiadi,giochiolimpici,paralimpiadi,paralympics,milanocortina,milanocortina2026,
mondiali,worldcup,fifaworldcup,euro2024,euro2028,euro2032,europei,copaamerica,nationsleague,
formula1,f1,formulauno,motogp,superbike,worldsbk,nascar,indycar,lemans,24hlemans,rally,wrc,dakar,
nba,nfl,mlb,nhl,ufc,wwe,boxe,
atp,wta,wimbledon,rolandgarros,usopen,australianopen,internazionalibnl,internazionaliditalia,atpfinals,nittoatpfinals,
daviscup,coppadavis,billiejeancup,
giroditalia,girodiitalia,tourdefrance,vuelta,milanosanremo,ilombardia,parisroubaix,
superbowl,ryder cup,rydercup,mastersaugusta,
seiNazioni,seinazioni,sixnations,federugby,
fit,fip,fipav,fin,fidal,fisi,
milanomarathon,maratonadiroma,romamarathon,nycmarathon,ironman
""")

# ------------------------------------------------------------------ PERSONAGGI PUBBLICI (nome e cognome o nome d'arte unico)
g('gold', 'persona', 'personaggio pubblico (il titolare può richiederlo)', """
cristianoronaldo,cr7,leomessi,lionelmessi,neymar,neymarjr,kylianmbappe,mbappe,erlinghaaland,haaland,mohamedsalah,
zlatanibrahimovic,ibrahimovic,davidbeckham,ronaldinho,ronaldonazario,kaka,diegomaradona,maradona,pele,zinedinezidane,
zidane,thierryhenry,luismodric,lukamodric,kevindebruyne,robertlewandowski,lewandowski,harrykane,judebellingham,
viniciusjr,lamineyamal,
francescototti,danielederossi,alessandrodelpiero,delpiero,gianluigibuffon,buffon,andreapirlo,paolomaldini,
fabiocannavaro,gennarogattuso,robertobaggio,christianvieri,bobovieri,filippoinzaghi,simoneinzaghi,
marcomaterazzi,alessandronesta,francescobaresi,giorgiochiellini,leonardobonucci,ciroimmobile,lorenzoinsigne,
nicolobarella,federicochiesa,gianluigidonnarumma,donnarumma,sandrotonali,mattiaretegui,
carloancelotti,ancelotti,josemourinho,mourinho,pepguardiola,guardiola,antonioconte,massimilianoallegri,
lucianospalletti,robertomancini,arrigosacchi,fabiocapello,marcelolippi,zdenekzeman,claudioranieri,
jannniksinner,janniksinner,sinner,matteoberrettini,berrettini,lorenzomusetti,flaviacobolli,jasminepaolini,
rafaelnadal,nadal,rogerfederer,federer,novakdjokovic,djokovic,carlosalcaraz,alcaraz,serenawilliams,
valentinorossi,vr46,marcmarquez,peccobagnaia,francescobagnaia,marcobezzecchi,
lewishamilton,hamilton,maxverstappen,verstappen,charlesleclerc,leclerc,carlossainz,fernandoalonso,
michaelschumacher,schumacher,ayrtonsenna,senna,kimiantonelli,andreakimiantonelli,
federicapellegrini,gregoriopaltrinieri,thomasceccon,marcelljacobs,gianmarcotamberi,tamberi,
sofiagoggia,federicabrignone,albertotomba,deborahcompagnoni,arianafontana,
alexzanardi,beavio,
michaeljordan,lebronjames,kobebryant,stephencurry,shaquilleoneal,
usainbolt,mikeTyson,miketyson,muhammadali,conormcgregor,
tigerwoods,simonebiles,
vascorossi,ligabue,lucianoligabue,jovanotti,lorenzojovanotti,eros,erosramazzotti,lauraPausini,laurapausini,
gianninamorandi,giannimorandi,albano,albanocarrisi,adrianocelentano,celentano,minamazzini,
zucchero,zuccherofornaciari,andreabocelli,bocelli,lucianopavarotti,pavarotti,claudiobaglioni,baglioni,
francescodegregori,degregori,lucadalla,fabriziodeandre,deandre,francobattiato,battiato,pinodaniele,
liciolucio,luciobattisti,battisti,renatozero,antonellovenditti,venditti,gigidalessio,gigidag,
tizianoferro,marcomengoni,mengoni,giorgia,emmamarrone,alessandraamoroso,elisa,elodie,annalisa,
maneskin,damianodavid,victoriadeangelis,thasiotorchio,ethantorchio,
fedez,sferaebbasta,geolier,lazza,tananai,mahmood,blanco,ultimo,ghali,salmo,marracash,guepequeno,gue,
anna pepe,annapepe,angelina mango,angelinamango,olly,irama,achillelauro,rkomi,madame,massimopericolo,
caparezza,articolo31,jax,jaxofficial,maxpezzali,883,nek,raf,umbertotozzi,
gianni morandi,
madonna,shakira,beyonce,rihanna,eminem,taylorswift,arianagrande,ladygaga,justinbieber,selenagomez,billieeilish,
dualipa,edsheeran,brunomars,theweeknd,drake,kanyewest,kanye,ye,jayz,snoopdogg,
michaeljackson,elvispresley,elvis,freddiemercury,davidbowie,johnlennon,paulmccartney,thebeatles,beatles,
rollingstones,therollingstones,micjagger,queen,u2,bono,coldplay,chrismartin,metallica,acdc,ironmaiden,
pinkfloyd,ledzeppelin,nirvana,kurtcobain,bonjovi,brucespringsteen,bobdylan,
celinedion,mariahcarey,whitneyhouston,adele,samsmith,harrystyles,onedirection,bts,blackpink,
roccosiffredi,moanapozzi,cicciolina,ilonastaller,valentinanappi,
sophialoren,monicabellucci,robertobenigni,benigni,carloverdone,verdone,albertosordi,totò,toto,
marcellomastroianni,ginalollobrigida,claudiacardinale,annamagnani,vittoriogassman,ugotognazzi,
paolosorrentino,sorrentino,federicofellini,fellini,sergioleone,giuseppetornatore,tornatore,nannimoretti,
pierfrancescofavino,favino,riccardoscamarcio,scamarcio,alessandroborghi,lucamarinelli,stefanoaccorsi,
paolacortellesi,cortellesi,checcozalone,zalone,ficarraepicone,aldogiovanniegiacomo,
leonardodicaprio,dicaprio,bradpitt,angelinajolie,tomcruise,tomhanks,johnnydepp,robertdeniro,alpacino,
scarlettjohansson,jenniferlawrence,margotrobbie,zendaya,timotheechalamet,
keanureeves,willsmith,denzelwashington,morganfreeman,meryl streep,merylstreep,nicolekidman,
dwaynejohnson,therock,vindiesel,jasonstatham,sylvesterstallone,arnoldschwarzenegger,
georgeclooney,mattdamon,benaffleck,chrisevans,chrishemsworth,robertdowneyjr,tomholland,
stevenspielberg,martinscorsese,quentintarantino,tarantino,christophernolan,jamescameron,
charliechaplin,marilynmonroe,audreyhepburn,
mariadefilippi,defilippi,gerryscotti,carloconti,amadeus,fiorello,rosariofiorello,paolobonolis,bonolis,
antonellaclerici,miccaellahunziker,michellehunziker,belenrodriguez,belen,ilaryblasi,
alessandrocattelan,cattelan,fabiofazio,brunovespa,barbaradurso,mara venier,maravenier,
pippobaudo,mikebongiorno,raffaellacarra,
albertoangela,pieroangela,
chiaraferragni,ferragni,khaby,khabylame,gianlucavacchi,vacchi,giuliadebenedetti,
favij,stmpodcast,iPantellas,ipantellas,cicciogamer89,cicciogamer,
mrbeast,pewdiepie,kimkardashian,kyliejenner,kardashian,parishilton,
elonmusk,musk,jeffbezos,billgates,markzuckerberg,zuckerberg,stevejobs,timcook,samaltman,
warrenbuffett,
giorgiameloni,meloni,matteosalvini,salvini,elly schlein,ellyschlein,schlein,giuseppeconte,matteorenzi,renzi,
silvioberlusconi,berlusconi,antoniotajani,tajani,carlocalenda,calenda,sergiomattarella,mattarella,
mariodraghi,draghi,romanoprodi,prodi,
donaldtrump,trump,joebiden,biden,barackobama,obama,michelleobama,kamalaharris,
emmanuelmacron,macron,olafscholz,vladimirputin,putin,volodymyrzelensky,zelensky,xijinping,
kingcharles,reCarlo,recarlo,principewilliam,princewilliam,princeharry,meghanmarkle,katemiddleton,
papafrancesco,papaleone,leonexiv,papaleonexiv,papagiovannipaoloii,
leonardodavinci,michelangelo,raffaellosanzio,caravaggio,galileogalilei,galileo,dantealighieri,dante,
giuseppeverdi,verdi,giacomopuccini,puccini,mozart,beethoven,
giuseppegaribaldi,garibaldi,cristoforocolombo,marcopolo,
albertEinstein,alberteinstein,einstein,
madreteresa,padrepio,
martinlutherking,nelsonmandela,gandhi,
"""
)

# ------------------------------------------------------------------ PERSONAGGI DI FANTASIA E FRANCHISE
g('gold', 'franchise', 'personaggi e franchise di intrattenimento', """
spiderman,spidermen,batman,superman,ironman,hulk,thor,captainamerica,wonderwoman,blackwidow,deadpool,wolverine,
xmen,avengers,justiceleague,joker,harleyquinn,
starwars,darthvader,yoda,lukeskywalker,harrypotter,hogwarts,hermione,
pokemon,pikachu,supermario,mario bros,mariobros,luigi bros,zelda,sonic,pacman,tetris,
topolino,mickeymouse,minnie,paperino,donaldduck,paperone,pippo,goofy,
barbie,kenbarbie,hellokitty,minions,shrek,simpsons,thesimpsons,homersimpson,
peppapig,paw patrol,pawpatrol,bluey,
gormiti,winx,winxclub,sailormoon,dragonball,goku,onepiece,naruto,
jamesbond,007,sherlockholmes,
gameofthrones,houseofthedragon,strangerthings,squidgame,lacasadepapel,breakingbad,
ilcommissariomontalbano,montalbano,donmatteo,gomorra,mareFuori,marefuori,
jurassicpark,toystory,cars,frozen,ilreleone,lionking,
"""
)

# ------------------------------------------------------------------ CITTÀ E TERRITORI
g('gold', 'citta', 'capoluogo, regione o territorio', """
italia,italy,europa,europe,
roma,rome,milano,milan,napoli,naples,torino,turin,palermo,genova,genoa,bologna,firenze,florence,bari,catania,venezia,
venice,verona,messina,padova,trieste,taranto,brescia,parma,prato,modena,reggiocalabria,reggioemilia,perugia,ravenna,
livorno,cagliari,foggia,rimini,salerno,ferrara,sassari,latina,giugliano,monza,siracusa,pescara,bergamo,forli,trento,
vicenza,terni,bolzano,novara,piacenza,ancona,andria,arezzo,udine,cesena,lecce,pesaro,barletta,alessandria,laspezia,
pisa,pistoia,lucca,catanzaro,brindisi,treviso,como,grosseto,varese,asti,caserta,ragusa,pavia,cremona,trapani,
carrara,massa,cosenza,potenza,vigevano,lamezia,altamura,imola,lodi,legnano,matera,siena,crotone,agrigento,
caltanissetta,enna,vibovalentia,avellino,benevento,isernia,campobasso,chieti,teramo,laquila,rieti,viterbo,frosinone,
macerata,fermo,ascolipiceno,urbino,pesarourbino,massacarrara,biella,cuneo,vercelli,verbania,aosta,sondrio,lecco,
mantova,belluno,rovigo,pordenone,gorizia,savona,imperia,nuoro,oristano,carbonia,iglesias,olbia,trani,
sanremo,capri,ischia,amalfi,positano,portofino,cortina,cortinadampezzo,taormina,cinqueterre,
piemonte,valledaosta,lombardia,trentino,altoadige,sudtirol,trentinoaltoadige,veneto,friuli,friuliveneziagiulia,
liguria,emiliaromagna,toscana,tuscany,umbria,marche,lazio,abruzzo,molise,campania,puglia,apulia,basilicata,calabria,
sicilia,sicily,sardegna,sardinia,
london,londra,paris,parigi,newyork,nyc,losangeles,miami,lasvegas,tokyo,dubai,madrid,barcelona,barcellona,berlin,
berlino,amsterdam,vienna,zurich,zurigo,ginevra,geneva,lisbona,lisbon,praga,prague,mosca,moscow,istanbul,
"""
)

# ------------------------------------------------------------------ NOMI GENERICI DI ATTIVITÀ (vetrine di categoria myquicktag)
g('black', 'generico', 'riservato a myquicktag: futura vetrina di categoria', """
pizzeria,pizza,pizze,pizzaiolo,ristorante,ristoranti,restaurant,trattoria,osteria,taverna,locanda,bistrot,bistro,
bar,caffe,caffetteria,cafe,coffee,coffeeshop,pasticceria,pasticcere,bakery,panificio,panetteria,forno,fornaio,
gelateria,gelato,gelati,yogurteria,cioccolateria,creperia,piadineria,paninoteca,panini,rosticceria,friggitoria,
kebab,sushi,ramen,pokè,poke,burger,hamburger,hamburgeria,steakhouse,braceria,griglieria,pescheria,macelleria,
macellaio,salumeria,gastronomia,alimentari,drogheria,enoteca,vineria,winebar,wine,vino,vini,birreria,birra,beer,pub,
cocktailbar,cocktail,aperitivo,lounge,discoteca,disco,club,nightclub,karaoke,
catering,banqueting,chef,cuoco,cuochi,food,foodtruck,streetfood,delivery,asporto,
parrucchiere,parrucchieri,parrucchiera,hairstylist,acconciature,barbiere,barber,barbershop,salone,salon,
estetista,esteticaenergia,centroestetico,estetica,beauty,bellezza,nails,unghie,onicotecnica,ciglia,lashes,
makeup,truccatrice,makeupartist,tatuaggi,tattoo,tatuatore,piercing,solarium,spa,benessere,wellness,massaggi,massaggio,
palestra,gym,fitness,personaltrainer,trainer,yoga,pilates,crossfit,boxe,danza,scuoladidanza,scuoladiballo,ballo,
piscina,nuoto,calcetto,padel,tennis,golf,sport,sports,
medico,medici,dottore,doctor,dentista,dentist,odontoiatra,ortodonzia,ortodontista,pediatra,ginecologo,cardiologo,
dermatologo,oculista,psicologo,psicologa,psicoterapeuta,psichiatra,nutrizionista,dietista,dietologo,fisioterapista,
fisioterapia,osteopata,chiropratico,logopedista,podologo,infermiere,poliambulatorio,clinica,ambulatorio,laboratorio,
analisi,farmacia,farmacista,parafarmacia,erboristeria,ottico,ottica,optometrista,veterinario,vet,clinicaveterinaria,
avvocato,avvocati,studiolegale,lawyer,notaio,commercialista,commercialisti,consulente,consulenza,consulting,
consulentedellavoro,ragioniere,geometra,architetto,architetti,ingegnere,ingegneri,perito,agronomo,
immobiliare,agenziaimmobiliare,realestate,casa,case,affitti,affitto,vendita,mutui,mutuo,assicurazione,assicurazioni,
broker,agente,agenzia,
idraulico,elettricista,imbianchino,pittoreedile,muratore,edilizia,impresaedile,costruzioni,ristrutturazioni,
falegname,falegnameria,fabbro,serramenti,infissi,vetraio,tappezziere,giardiniere,giardinaggio,vivaio,
traslochi,trasloco,pulizie,impresadipulizie,lavanderia,tintoria,sartoria,sarta,sarto,calzolaio,ciabattino,
fioraio,fiorista,fiori,florist,libreria,libri,cartoleria,tabaccheria,tabacchi,edicola,ferramenta,colorificio,
autofficina,officina,meccanico,carrozzeria,carrozziere,gommista,elettrauto,autolavaggio,concessionaria,
autosalone,autonoleggio,noleggio,rent,taxi,ncc,autoscuola,scuolaguida,
hotel,albergo,alberghi,bnb,bedandbreakfast,affittacamere,agriturismo,campeggio,camping,ostello,hostel,resort,
casavacanze,vacanze,viaggi,travel,agenziaviaggi,turismo,tour,guide,guidaturistica,
negozio,negozi,shop,shoponline,store,boutique,outlet,emporio,bazar,mercato,market,supermercato,minimarket,
ipermercato,discount,ortofrutta,fruttivendolo,frutta,verdura,biologico,bio,
gioielleria,gioielli,orologeria,orologi,profumeria,profumi,cosmetica,cosmetici,abbigliamento,moda,fashion,
scarpe,calzature,borse,intimo,sposa,sposi,abitidasposa,wedding,weddingplanner,matrimoni,matrimonio,
eventi,events,feste,party,animazione,animatore,intrattenimento,dj,musica,music,musicista,band,cantante,
fotografo,fotografa,fotografia,photographer,photography,foto,videomaker,video,regista,
grafico,grafica,graphicdesigner,designer,design,webdesigner,webdesign,web,sitoweb,siti,sviluppatore,developer,
programmatore,software,informatica,computer,tecnico,riparazioni,riparazione,assistenzapc,telefonia,
marketing,digitalmarketing,socialmediamanager,smm,seo,copywriter,comunicazione,ufficiostampa,pubblicita,
influencer,creatorcontent,contentcreator,youtuber,streamer,gamer,podcast,podcaster,blogger,blog,vlogger,
coach,lifecoach,businesscoach,mentor,formatore,formazione,corsi,corso,academy,accademia,scuola,school,
insegnante,professore,ripetizioni,tutor,lezioni,doposcuola,asilo,asilonido,nido,ludoteca,babysitter,tata,
badante,assistenzaanziani,casadiriposo,rsa,
petshop,animali,toelettatura,dogsitter,petsitter,canile,allevamento,addestratore,
artista,artisti,arte,art,pittore,scultore,galleria,gallery,artigiano,artigianato,handmade,ceramica,
stilista,modella,modello,model,attore,attrice,teatro,cinema,
ecommerce,startup,azienda,aziende,impresa,imprese,ditta,business,company,srl,spa,
lavoro,lavori,jobs,annunci,offerte,offerta,sconti,sconto,promo,promozioni,coupon,saldi,
notizie,news,giornale,meteo,oroscopo,ricette,cucina,
app,apps,tech,technology,tecnologia,digitale,digital,online,internet,social,
servizi,servizio,service,services,pro,professionista,freelance,
"""
)

# ------------------------------------------------------------------ OFFESE, ODIO, CONTENUTI PER ADULTI
g('black', 'offensivo', 'volgarità, odio, estremismo', """
cazzo,cazzi,cazzone,cazzona,cazzata,minchia,minchione,mignotta,mignotte,puttana,puttane,puttaniere,troia,troie,zoccola,
zoccole,zoccolona,baldracca,bagascia,figa,fica,fighe,pompino,pompini,inculare,inculata,culo,culone,rottinculo,
merda,merdoso,stronzo,stronza,stronzi,stronzata,coglione,cogliona,coglioni,coglionata,bastardo,bastarda,bastardi,
vaffanculo,fanculo,affanculo,sticazzi,cornuto,cornuta,frocio,froci,ricchione,ricchioni,culattone,finocchio,
negro,negri,negra,terrone,terroni,polentone,zingaro,zingari,mongoloide,ritardato,handicappato,down,
porcodio,diocane,dioporco,diobestia,porcamadonna,madonnaputtana,porcoddio,dioboia,cristodio,
fuck,fucker,fucking,motherfucker,shit,bullshit,bitch,bitches,asshole,dick,cock,pussy,cunt,whore,slut,
bastard,nigger,nigga,faggot,retard,
porn,porno,pornhub,xvideos,xnxx,youporn,redtube,xhamster,brazzers,sex,sexy,xxx,hentai,milf,escort,escorts,
camgirl,nudes,nude,nudi,sesso,
hitler,adolfhitler,nazi,nazista,nazisti,naziskin,ss,heilhitler,siegheil,kkk,kukluxklan,whitepower,
mussolini,benitomussolini,ilduce,duce,fascista,fascisti,
isis,alqaeda,alqaida,talebani,taliban,hamas,hezbollah,brigaterosse,
mafia,camorra,ndrangheta,cosanostra,sacracoronaunita,mafioso,boss,
pedofilo,pedofili,pedofilia,pedopornografia,
cocaina,eroina,droga,spaccio,
suicidio,
"""+"", """
vaffanculo,porcodio,diocane,dioporco,porcamadonna,madonnaputtana,porcoddio,fuck,motherfucker,pedofil,pedopornografia,
hitler,nigger,nigga,faggot,pornhub,xvideos,brazzers,siegheil,heilhitler,kukluxklan,coglion,stronz,minchia,mignott,
ricchion,culatton,merdos,frocio,froci
""")

# ------------------------------------------------------------------ BESTEMMIE: ogni combinazione, in entrambi gli ordini
_sacri = ['dio', 'ddio', 'madonna', 'cristo', 'gesu', 'gesucristo', 'signore', 'santo', 'santi']
_insulti = ['porco', 'porca', 'porci', 'cane', 'cani', 'maiale', 'maiala', 'boia', 'bestia', 'troia', 'puttana',
            'ladro', 'serpente', 'merda', 'bastardo', 'infame', 'lurido', 'schifoso', 'stronzo', 'zoccola', 'impestato']
_comb = set()
for s in _sacri:
    for i in _insulti:
        _comb.add(s + i); _comb.add(i + s)
g('black', 'offensivo', 'bestemmia (tutte le combinazioni)', '', sorted(_comb))
