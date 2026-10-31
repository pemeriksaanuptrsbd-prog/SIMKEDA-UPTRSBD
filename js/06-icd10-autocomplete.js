    // ══════════════════════════════════════
    //  ICD-10 DATA & AUTOCOMPLETE
    // ══════════════════════════════════════
    const _ICD10 = [
      ['A00','Kolera'],['A00.0','Kolera akibat Vibrio cholerae O1 biovar cholerae'],['A00.1','Kolera akibat Vibrio cholerae O1 biovar El Tor'],['A00.9','Kolera tidak spesifik'],
      ['A01','Demam tifoid dan paratifoid'],['A01.0','Demam tifoid'],['A01.1','Demam paratifoid A'],['A01.2','Demam paratifoid B'],['A01.3','Demam paratifoid C'],
      ['A02','Infeksi Salmonella lainnya'],['A02.0','Enteritis Salmonella'],['A02.1','Septikemia Salmonella'],['A02.9','Infeksi Salmonella tidak spesifik'],
      ['A03','Shigelosis Disentri basiler'],['A03.0','Shigelosis Shigella dysenteriae'],['A03.1','Shigelosis Shigella flexneri'],['A03.9','Shigelosis tidak spesifik'],
      ['A04','Infeksi usus bakterial lainnya'],['A04.0','Escherichia coli enteropatogenik'],['A04.1','Escherichia coli enterotoksigenik'],['A04.5','Enteritis Campylobacter'],['A04.6','Yersinia enterocolitica'],['A04.7','Clostridium difficile'],['A04.9','Infeksi usus bakterial tidak spesifik'],
      ['A05','Keracunan makanan bakterial'],['A05.0','Keracunan makanan Staphylococcal'],['A05.1','Botulisme'],['A05.9','Keracunan makanan bakterial tidak spesifik'],
      ['A06','Amebiasis'],['A06.0','Disentri ameba akut'],['A06.1','Amebiasis usus kronik'],['A06.4','Abses hati ameba'],['A06.9','Amebiasis tidak spesifik'],
      ['A07','Penyakit usus protozoa'],['A07.1','Giardiasis lambliasis'],['A07.2','Kriptosporidiosis'],['A07.9','Penyakit usus protozoa tidak spesifik'],
      ['A08','Infeksi usus viral'],['A08.0','Enterokolitis rotavirus'],['A08.4','Infeksi usus viral tidak spesifik'],
      ['A09','Diare dan gastroenteritis akut'],
      ['A15','Tuberkulosis paru terkonfirmasi'],['A15.0','TB paru terkonfirmasi sputum mikroskopi'],['A15.3','TB paru terkonfirmasi tidak spesifik'],
      ['A16','Tuberkulosis paru tidak terkonfirmasi'],['A16.2','TB paru tanpa penyebutan konfirmasi'],['A16.9','Tuberkulosis pernapasan tidak spesifik'],
      ['A17','Tuberkulosis susunan saraf'],['A17.0','Meningitis tuberkulosis'],
      ['A18','Tuberkulosis organ lainnya'],['A18.0','TB tulang dan sendi'],['A18.1','TB saluran kemih dan genital'],['A18.2','Limfadenopati TB perifer'],['A18.3','TB usus peritoneum'],['A18.4','TB kulit'],['A18.5','TB mata'],
      ['A19','Tuberkulosis milier'],['A19.9','Tuberkulosis milier tidak spesifik'],
      ['A20','Pes Plague'],['A22','Antraks'],['A23','Bruselosis'],['A27','Leptospirosis'],
      ['A30','Lepra Kusta'],['A30.0','Lepra tidak terdiagnosa'],['A30.1','Lepra tuberkuloid'],['A30.2','Lepra borderline tuberkuloid'],['A30.3','Lepra borderline'],['A30.4','Lepra borderline lepromatosa'],['A30.5','Lepra lepromatosa'],['A30.9','Lepra tidak spesifik'],
      ['A33','Tetanus neonatorum'],['A34','Tetanus obstetrik'],['A35','Tetanus'],
      ['A36','Difteri'],['A36.0','Difteri faring'],['A36.2','Difteri laring'],['A36.9','Difteri tidak spesifik'],
      ['A37','Batuk rejan Pertusis'],['A37.0','Pertusis Bordetella pertussis'],['A37.9','Batuk rejan tidak spesifik'],
      ['A38','Demam scarlet Skarlatina'],['A39','Infeksi meningokokal'],['A39.0','Meningitis meningokokal'],
      ['A40','Sepsis streptokokal'],['A41','Sepsis'],['A41.0','Sepsis Staphylococcus aureus'],['A41.9','Sepsis tidak spesifik'],
      ['A46','Erisipelas'],['A49','Infeksi bakterial tidak spesifik'],
      ['A50','Sifilis kongenital'],['A51','Sifilis dini'],['A51.0','Sifilis genital primer'],['A51.3','Sifilis sekunder kulit'],['A52','Sifilis lanjut'],
      ['A54','Infeksi gonokokal'],['A54.0','Gonore saluran kemih bawah'],['A54.9','Gonore tidak spesifik'],
      ['A56','Klamidia menular seksual'],['A56.0','Klamidia saluran kemih bawah'],['A56.2','Klamidia urogenital tidak spesifik'],
      ['A57','Ulkus mole Chancroid'],['A59','Trikomoniasis'],['A60','Herpes anogenital'],
      ['A70','Chlamydia psittaci'],['A71','Trachoma'],
      ['A80','Poliomielitis akut'],['A82','Rabies'],['A83','Ensefalitis virus nyamuk'],['A87','Meningitis viral'],['A86','Ensefalitis viral'],
      ['A90','Demam dengue'],['A91','Demam berdarah dengue DBD'],
      ['A92','Chikungunya West Nile'],['A92.0','Chikungunya'],['A92.3','West Nile fever'],
      ['A95','Demam kuning'],
      ['B00','Herpes simplex'],['B00.0','Eksim herpetikum'],['B00.2','Stomatitis herpetik'],['B00.9','Herpes simplex tidak spesifik'],
      ['B01','Varisela cacar air'],['B01.9','Varisela tanpa komplikasi'],
      ['B02','Herpes zoster'],['B02.0','Ensefalitis herpes zoster'],['B02.3','Herpes zoster okular'],['B02.9','Herpes zoster tanpa komplikasi'],
      ['B05','Campak Measles'],['B05.9','Campak tanpa komplikasi'],
      ['B06','Rubela German measles'],['B06.9','Rubela tanpa komplikasi'],
      ['B07','Kutil viral'],['B08','Infeksi viral lesi kulit'],
      ['B15','Hepatitis A akut'],['B15.9','Hepatitis A tanpa koma hepatik'],
      ['B16','Hepatitis B akut'],['B16.9','Hepatitis B akut tanpa koma'],
      ['B17','Hepatitis viral akut lainnya'],['B17.1','Hepatitis C akut'],['B17.2','Hepatitis E akut'],
      ['B18','Hepatitis viral kronik'],['B18.1','Hepatitis B kronik'],['B18.2','Hepatitis C kronik'],['B18.9','Hepatitis viral kronik tidak spesifik'],
      ['B19','Hepatitis viral tidak spesifik'],
      ['B20','HIV infeksi oportunistik'],['B21','HIV keganasan'],['B24','HIV tidak spesifik'],
      ['B25','Sitomegalovirus CMV'],['B26','Parotitis Gondok'],['B26.9','Parotitis tanpa komplikasi'],
      ['B27','Mononukleosis infeksiosa'],['B30','Konjungtivitis viral'],
      ['B35','Dermatofitosis Tinea Kurap'],['B35.0','Tinea kapitis kurap kepala'],['B35.1','Tinea unguium kuku'],['B35.3','Tinea pedis kaki atlet'],['B35.4','Tinea korporis kurap badan'],['B35.6','Tinea kruris kurap selangkangan'],['B35.9','Dermatofitosis tidak spesifik'],
      ['B36','Mikosis superfisial'],['B36.0','Pitiriasis versikolor panu'],
      ['B37','Kandidiasis'],['B37.0','Kandidiasis mulut sariawan'],['B37.2','Kandidiasis kulit kuku'],['B37.3','Kandidiasis vagina'],['B37.9','Kandidiasis tidak spesifik'],
      ['B44','Aspergilosis'],['B45','Kriptokokosis'],['B49','Mikosis tidak spesifik'],
      ['B50','Malaria falciparum'],['B50.9','Malaria falciparum tidak spesifik'],
      ['B51','Malaria vivax'],['B51.9','Malaria vivax tanpa komplikasi'],
      ['B52','Malaria malariae'],['B54','Malaria tidak spesifik'],
      ['B55','Leishmaniasis'],['B58','Toksoplasmosis'],['B60','Protozoa lainnya'],
      ['B65','Skistosomiasis'],['B68','Taeniasis'],['B69','Sistiserkosis'],
      ['B76','Cacing tambang Hookworm'],['B76.0','Ankylostomiasis'],['B76.9','Cacing tambang tidak spesifik'],
      ['B77','Askariasis cacing gelang'],['B77.9','Askariasis tidak spesifik'],
      ['B78','Strongiloidiasis'],['B79','Trikuriasis cacing cambuk'],['B80','Enterobiasis cacing kremi'],
      ['B82','Parasitosis usus tidak spesifik'],
      ['B85','Pedikulosis kutu'],['B85.0','Kutu kepala'],['B85.3','Ftiriasis'],
      ['B86','Skabies kudis'],['B87','Miasis'],
      ['B90','Sekuele tuberkulosis'],['B94','Sekuele penyakit infeksi'],
      ['C00','Kanker bibir'],['C01','Kanker dasar lidah'],
      ['C15','Kanker esofagus'],['C16','Kanker lambung'],['C18','Kanker kolon'],['C19','Kanker rektosigmoid'],['C20','Kanker rektum'],
      ['C22','Kanker hati'],['C25','Kanker pankreas'],
      ['C32','Kanker laring'],['C33','Kanker trakea'],['C34','Kanker bronkus dan paru'],
      ['C43','Melanoma ganas'],['C44','Kanker kulit'],['C45','Mesotelioma'],['C46','Sarkoma Kaposi'],
      ['C50','Kanker payudara'],['C50.9','Kanker payudara tidak spesifik'],
      ['C53','Kanker serviks uteri'],['C54','Kanker korpus uteri'],['C56','Kanker ovarium'],
      ['C61','Kanker prostat'],['C62','Kanker testis'],
      ['C64','Kanker ginjal'],['C67','Kanker kandung kemih'],
      ['C71','Kanker otak'],['C71.9','Kanker otak tidak spesifik'],
      ['C73','Kanker tiroid'],
      ['C81','Penyakit Hodgkin'],['C83','Limfoma Non Hodgkin'],
      ['C90','Mieloma multipel'],
      ['C91','Leukemia limfoid'],['C91.0','Leukemia limfoblastik akut ALL'],['C91.1','Leukemia limfositik kronik CLL'],
      ['C92','Leukemia mieloid'],['C92.0','Leukemia mieloid akut AML'],['C92.1','Leukemia mieloid kronik CML'],
      ['D25','Miom uterus Leiomioma'],['D27','Kista ovarium jinak'],
      ['D50','Anemia defisiensi besi'],['D50.0','Anemia defisiensi besi kehilangan darah kronik'],['D50.9','Anemia defisiensi besi tidak spesifik'],
      ['D51','Anemia defisiensi vitamin B12'],['D52','Anemia defisiensi folat'],['D53','Anemia defisiensi gizi lainnya'],
      ['D56','Talasemia'],['D56.0','Alfa talasemia'],['D56.1','Beta talasemia'],['D56.9','Talasemia tidak spesifik'],
      ['D57','Anemia sel sabit'],['D61','Anemia aplastik'],['D64','Anemia lainnya'],['D64.9','Anemia tidak spesifik'],
      ['D65','DIC Koagulasi intravaskular diseminata'],
      ['D66','Hemofilia A defisiensi faktor VIII'],['D67','Hemofilia B defisiensi faktor IX'],
      ['D69','Purpura'],['D70','Agranulositosis'],
      ['E00','Defisiensi iodium kongenital'],['E01','Gondok akibat iodium'],['E03','Hipotiroidisme'],['E03.9','Hipotiroidisme tidak spesifik'],
      ['E04','Gondok non-toksik'],['E04.9','Gondok non-toksik tidak spesifik'],
      ['E05','Hipertiroid Tirotoksikosis'],['E05.0','Graves disease gondok difus toksik'],['E05.9','Tirotoksikosis tidak spesifik'],
      ['E06','Tiroiditis'],['E06.0','Tiroiditis akut'],['E06.1','Tiroiditis subakut'],['E06.3','Tiroiditis Hashimoto autoimun'],
      ['E10','Diabetes melitus tipe 1'],['E10.9','DM tipe 1 tanpa komplikasi'],
      ['E11','Diabetes melitus tipe 2'],['E11.2','DM tipe 2 komplikasi ginjal nefropati'],['E11.3','DM tipe 2 komplikasi mata retinopati'],['E11.4','DM tipe 2 komplikasi neuropati'],['E11.5','DM tipe 2 komplikasi vaskular perifer'],['E11.9','DM tipe 2 tanpa komplikasi'],
      ['E14','Diabetes melitus tidak spesifik'],
      ['E15','Koma hipoglikemik'],
      ['E22','Akromegali gigantisme hiperfungsi hipofisis'],['E22.0','Akromegali'],
      ['E24','Sindroma Cushing'],['E26','Hiperaldosteronisme'],['E27','Insufisiensi adrenal Addison'],
      ['E40','Kwashiorkor'],['E41','Marasmus'],['E43','Malnutrisi protein-energi berat'],['E44','Malnutrisi sedang ringan'],['E46','Malnutrisi tidak spesifik'],
      ['E50','Defisiensi vitamin A'],['E51','Beri-beri defisiensi tiamin'],['E52','Pelagra defisiensi niasin'],['E54','Skorbut defisiensi vitamin C'],['E55','Riketsia defisiensi vitamin D'],['E55.9','Defisiensi vitamin D tidak spesifik'],
      ['E58','Defisiensi kalsium'],['E60','Defisiensi seng'],['E61','Defisiensi mineral lainnya'],
      ['E66','Obesitas'],['E66.0','Obesitas akibat energi berlebih'],['E66.9','Obesitas tidak spesifik'],
      ['E78','Dislipidemia hiperlipidemia'],['E78.0','Hiperkolesterolemia'],['E78.1','Hipertrigliseridemia'],['E78.2','Hiperlipidemia campuran'],['E78.5','Hiperlipidemia tidak spesifik'],
      ['E79','Gout Asam urat hiperurikemia'],['E79.0','Hiperurikemia tanpa artritis'],
      ['E83','Gangguan metabolisme mineral'],['E86','Dehidrasi deplesi volume'],
      ['E87','Gangguan elektrolit cairan'],['E87.0','Hipernatremia'],['E87.1','Hiponatremia'],['E87.2','Asidosis'],['E87.3','Alkalosis'],['E87.5','Hiperkalemia'],['E87.6','Hipokalemia'],
      ['E88','Gangguan metabolik lainnya'],
      ['F00','Demensia Alzheimer'],['F01','Demensia vaskular'],['F03','Demensia tidak spesifik'],['F05','Delirium'],
      ['F10','Gangguan mental akibat alkohol'],['F11','Gangguan akibat opioid'],['F17','Gangguan akibat tembakau'],['F19','Gangguan akibat zat psikoaktif multipel'],
      ['F20','Skizofrenia'],['F20.0','Skizofrenia paranoid'],['F20.1','Skizofrenia hebefrenik'],['F20.9','Skizofrenia tidak spesifik'],
      ['F25','Gangguan skizoafektif'],['F25.0','Skizoafektif tipe manik'],['F25.1','Skizoafektif tipe depresif'],
      ['F31','Gangguan bipolar'],['F31.9','Gangguan bipolar tidak spesifik'],
      ['F32','Episode depresif'],['F32.0','Depresi ringan'],['F32.1','Depresi sedang'],['F32.2','Depresi berat tanpa psikosis'],['F32.3','Depresi berat dengan psikosis'],['F32.9','Episode depresif tidak spesifik'],
      ['F33','Depresi berulang'],['F39','Gangguan afektif tidak spesifik'],
      ['F40','Fobia agorafobia fobia sosial'],['F40.0','Agorafobia'],['F40.1','Fobia sosial'],['F40.2','Fobia spesifik'],
      ['F41','Gangguan ansietas'],['F41.0','Gangguan panik'],['F41.1','Gangguan ansietas menyeluruh GAD'],['F41.2','Ansietas depresi campuran'],['F41.9','Gangguan ansietas tidak spesifik'],
      ['F42','OCD Obsesif kompulsif'],
      ['F43','Reaksi stres PTSD'],['F43.0','Reaksi stres akut'],['F43.1','PTSD stres pasca traumatik'],['F43.2','Gangguan penyesuaian'],
      ['F44','Gangguan disosiatif konversi'],['F45','Gangguan somatoform'],['F45.0','Somatisasi'],['F45.2','Hipokondriasis'],
      ['F50','Anoreksia bulimia gangguan makan'],['F50.0','Anoreksia nervosa'],['F50.2','Bulimia nervosa'],
      ['F51','Insomnia gangguan tidur non-organik'],
      ['F70','Retardasi mental ringan'],['F71','Retardasi mental sedang'],['F72','Retardasi mental berat'],
      ['F84','Autisme gangguan perkembangan pervasif'],['F84.0','Autisme masa kanak'],['F84.5','Sindroma Asperger'],
      ['F90','ADHD gangguan hiperkinetik'],
      ['G00','Meningitis bakterial'],['G00.1','Meningitis pneumokokal'],['G00.9','Meningitis bakterial tidak spesifik'],
      ['G03','Meningitis lainnya'],['G04','Ensefalitis mielitis'],['G06','Abses intrakranial'],
      ['G10','Huntington'],['G11','Ataksia herediter'],
      ['G20','Parkinson'],['G21','Parkinsonisme sekunder'],['G23','Degenerasi ganglia basalis'],
      ['G30','Alzheimer'],['G30.0','Alzheimer onset dini'],['G30.1','Alzheimer onset lambat'],['G30.9','Alzheimer tidak spesifik'],
      ['G35','Sklerosis multipel'],
      ['G40','Epilepsi'],['G40.0','Epilepsi parsial idiopatik'],['G40.3','Epilepsi umum idiopatik'],['G40.6','Grand mal'],['G40.7','Petit mal'],['G40.9','Epilepsi tidak spesifik'],
      ['G41','Status epileptikus'],
      ['G43','Migrain'],['G43.0','Migrain tanpa aura'],['G43.1','Migrain dengan aura'],['G43.9','Migrain tidak spesifik'],
      ['G44','Nyeri kepala lainnya'],['G45','TIA serangan iskemik transien'],
      ['G47','Gangguan tidur'],['G47.0','Insomnia'],['G47.1','Hipersomnia'],['G47.3','Apnea tidur'],['G47.4','Narkolepsi'],['G47.9','Gangguan tidur tidak spesifik'],
      ['G50','Gangguan saraf trigeminal neuralgia trigeminal'],
      ['G51','Bell palsy paralisis fasial'],['G51.0','Bell palsy'],
      ['G54','Gangguan akar saraf pleksus'],['G54.0','Pleksus brakialis'],['G54.2','Akar servikal'],['G54.4','Akar lumbosakral'],
      ['G56','Mononeuropati tangan CTS'],['G56.0','Carpal tunnel syndrome CTS'],['G56.2','Lesi saraf ulnar'],
      ['G57','Mononeuropati kaki'],['G57.0','Lesi saraf skiatik'],['G57.1','Meralgia parestetika'],
      ['G60','Neuropati herediter'],['G61','Guillain-Barre'],['G61.0','Guillain-Barre syndrome'],['G62','Polineuropati lainnya'],['G63','Polineuropati diabetik neuropati perifer'],
      ['G70','Miastenia gravis'],
      ['G80','Palsi serebral CP'],['G80.0','Spastik kuadriplegia'],['G80.1','Spastik diplegia'],['G80.2','Spastik hemiplegia'],['G80.9','Palsi serebral tidak spesifik'],
      ['G81','Hemiplegia'],['G81.0','Hemiplegia flasid'],['G81.1','Hemiplegia spastik'],['G81.9','Hemiplegia tidak spesifik'],
      ['G82','Paraplegia tetraplegia'],['G82.0','Paraplegia flasid'],['G82.1','Paraplegia spastik'],['G82.3','Tetraplegia flasid'],['G82.4','Tetraplegia spastik'],
      ['G83','Sindroma paralitik lainnya'],['G83.4','Cauda equina'],
      ['G89','Nyeri kronik'],['G91','Hidrosefalus'],['G92','Ensefalopati toksik'],['G93','Penyakit otak lainnya'],
      ['H00','Bintitan hordeolum kalazion'],['H00.0','Hordeolum bintitan'],['H00.1','Kalazion'],
      ['H10','Konjungtivitis mata merah'],['H10.0','Konjungtivitis mukopurulen'],['H10.3','Konjungtivitis akut tidak spesifik'],['H10.9','Konjungtivitis tidak spesifik'],
      ['H16','Keratitis'],['H20','Iridosiklitis uveitis anterior'],
      ['H25','Katarak senilis terkait usia'],['H25.9','Katarak senilis tidak spesifik'],
      ['H26','Katarak lainnya'],
      ['H40','Glaukoma'],['H40.1','Glaukoma sudut terbuka'],['H40.2','Glaukoma sudut tertutup'],['H40.9','Glaukoma tidak spesifik'],
      ['H46','Neuritis optik'],
      ['H52','Gangguan refraksi'],['H52.0','Hipermetropia rabun dekat'],['H52.1','Miopia rabun jauh'],['H52.2','Astigmatisme'],['H52.4','Presbiopia'],['H52.7','Gangguan refraksi tidak spesifik'],
      ['H54','Gangguan penglihatan kebutaan'],
      ['H60','Otitis eksterna'],['H60.9','Otitis eksterna tidak spesifik'],
      ['H65','Otitis media non-supuratif'],['H65.0','Otitis media serosa akut'],['H65.9','Otitis media non-supuratif tidak spesifik'],
      ['H66','OMSK otitis media supuratif kronik'],['H66.0','Otitis media supuratif akut'],['H66.3','Otitis media supuratif kronik'],['H66.9','Otitis media tidak spesifik'],
      ['H70','Mastoiditis'],['H71','Kolesteatoma'],['H72','Perforasi membran timpani'],
      ['H80','Otosklerosis'],
      ['H81','Vertigo Meniere'],['H81.0','Meniere'],['H81.1','BPPV vertigo posisi paroksismal'],['H81.2','Neuronitis vestibular'],['H81.3','Vertigo perifer'],['H81.4','Vertigo sentral'],['H81.9','Vertigo tidak spesifik'],
      ['H90','Tuli'],['H90.0','Tuli konduktif bilateral'],['H90.3','Tuli sensorineural bilateral'],['H90.5','Tuli sensorineural tidak spesifik'],
      ['H91','Tuli lainnya'],['H92','Otalgia nyeri telinga'],
      ['I00','Demam reumatik'],['I05','Penyakit katup mitral reumatik'],['I06','Penyakit katup aorta reumatik'],
      ['I09','Penyakit reumatik jantung lainnya'],['I09.0','Miokarditis reumatik'],['I09.1','Endokarditis reumatik'],['I09.2','Perikarditis reumatik kronik'],['I09.8','Penyakit reumatik jantung lainnya'],['I09.9','Penyakit reumatik jantung tidak spesifik'],
      ['I10','Hipertensi esensial primer'],
      ['I11','Hipertensi dengan penyakit jantung'],['I11.0','Hipertensi jantung dengan gagal jantung'],['I11.9','Hipertensi jantung tanpa gagal jantung'],
      ['I12','Hipertensi dengan penyakit ginjal'],['I12.0','Hipertensi ginjal dengan gagal ginjal'],
      ['I13','Hipertensi dengan penyakit jantung dan ginjal'],['I15','Hipertensi sekunder'],
      ['I20','Angina pektoris'],['I20.0','Angina tidak stabil'],['I20.9','Angina pektoris tidak spesifik'],
      ['I21','Infark miokard akut serangan jantung AMI'],['I21.0','AMI dinding anterior'],['I21.1','AMI dinding inferior'],['I21.9','AMI tidak spesifik'],
      ['I25','Penyakit jantung iskemik kronik'],['I25.1','Penyakit jantung aterosklerotik'],['I25.9','PJK kronik tidak spesifik'],
      ['I26','Emboli paru'],['I27','Hipertensi pulmonal'],
      ['I33','Endokarditis'],['I34','Gangguan katup mitral'],['I35','Gangguan katup aorta'],
      ['I42','Kardiomiopati'],['I42.0','Kardiomiopati dilatasi'],['I42.9','Kardiomiopati tidak spesifik'],
      ['I44','Blok jantung'],['I47','Takikardia paroksismal SVT'],['I48','Fibrilasi atrial aritmia'],['I49','Aritmia lainnya'],
      ['I50','Gagal jantung'],['I50.0','Gagal jantung kongestif CHF'],['I50.1','Gagal ventrikel kiri'],['I50.9','Gagal jantung tidak spesifik'],
      ['I60','Perdarahan subaraknoid SAH'],['I61','Perdarahan intraserebral ICB'],['I62','Perdarahan intrakranial lainnya'],
      ['I63','Stroke iskemik infark serebral'],['I63.0','Trombosis arteri praserebral'],['I63.9','Infark serebral tidak spesifik'],
      ['I64','Stroke tidak spesifik'],
      ['I67','Penyakit serebrovaskular lainnya'],['I69','Sekuele stroke'],
      ['I70','Aterosklerosis'],['I71','Aneurisma aorta'],['I73','Penyakit vaskular perifer'],['I74','Emboli trombosis arteri'],
      ['I80','Flebitis tromboflebitis'],['I82','Emboli trombosis vena DVT'],
      ['I83','Varises vena tungkai'],['I84','Hemoroid wasir'],['I84.9','Hemoroid tidak spesifik'],
      ['I85','Varises esofagus'],
      ['I95','Hipotensi'],['I99','Gangguan sirkulasi tidak spesifik'],
      ['J00','Flu biasa ISPA atas nasofaringitis selesma'],
      ['J01','Sinusitis akut'],['J01.0','Sinusitis maksilaris akut'],['J01.4','Pansinusitis akut'],['J01.9','Sinusitis akut tidak spesifik'],
      ['J02','Faringitis akut'],['J02.0','Faringitis streptokokal'],['J02.9','Faringitis akut tidak spesifik'],
      ['J03','Tonsilitis akut'],['J03.0','Tonsilitis streptokokal'],['J03.9','Tonsilitis akut tidak spesifik'],
      ['J04','Laringitis trakeitis akut'],['J05','Laringitis obstruktif croup'],
      ['J06','ISPA atas akut'],['J06.9','ISPA atas tidak spesifik'],
      ['J10','Influenza virus teridentifikasi'],['J11','Influenza virus tidak teridentifikasi'],['J11.1','Influenza pernapasan'],
      ['J12','Pneumonia viral'],['J13','Pneumonia Streptococcus pneumoniae'],['J15','Pneumonia bakterial'],['J15.9','Pneumonia bakterial tidak spesifik'],
      ['J18','Pneumonia tidak spesifik'],['J18.0','Bronkopneumonia'],['J18.9','Pneumonia tidak spesifik'],
      ['J20','Bronkitis akut'],['J20.9','Bronkitis akut tidak spesifik'],['J22','ISPA bawah akut tidak spesifik'],
      ['J30','Rinitis alergi vasomotor'],['J30.1','Rinitis alergi serbuk sari'],['J30.4','Rinitis alergi tidak spesifik'],
      ['J32','Sinusitis kronik'],['J33','Polip nasal'],
      ['J35','Tonsilitis adenoiditis kronik'],['J35.0','Tonsilitis kronik'],['J35.1','Adenoiditis kronik'],['J35.2','Hipertrofi tonsil adenoid'],['J35.9','Penyakit tonsil kronik tidak spesifik'],
      ['J36','Abses peritonsilar'],['J38','Polip laring gangguan pita suara'],
      ['J40','Bronkitis tidak spesifik'],['J41','Bronkitis kronik'],['J42','Bronkitis kronik tidak spesifik'],['J43','Emfisema'],
      ['J44','PPOK penyakit paru obstruktif kronik'],['J44.9','PPOK tidak spesifik'],
      ['J45','Asma'],['J45.0','Asma alergi'],['J45.1','Asma non-alergi'],['J45.9','Asma tidak spesifik'],
      ['J46','Status asmatikus'],['J47','Bronkiektasis'],
      ['J80','ARDS sindrom distres pernapasan'],['J81','Edema paru'],['J86','Empiema piotoraks'],
      ['J90','Efusi pleura'],['J93','Pneumotoraks'],['J96','Gagal napas'],
      ['K02','Karies gigi'],['K04','Pulpitis penyakit pulpa gigi'],['K05','Gingivitis periodontitis'],['K08','Gangguan gigi'],
      ['K09','Kista mulut tidak terklasifikasi lainnya'],['K09.0','Kista odontogenik perkembangan'],['K09.1','Kista fissural'],['K09.2','Kista tulang lainnya'],['K09.8','Kista oral lainnya'],['K09.9','Kista oral tidak spesifik'],
      ['K12','Stomatitis sariawan'],
      ['K20','Esofagitis'],['K21','GERD refluks gastroesofageal'],['K21.0','GERD dengan esofagitis'],['K21.9','GERD tanpa esofagitis'],
      ['K25','Ulkus lambung'],['K25.9','Ulkus lambung tidak spesifik'],
      ['K26','Ulkus duodenum tukak duodenum'],['K27','Ulkus peptik'],
      ['K29','Gastritis duodenitis'],['K29.0','Gastritis akut hemoragik'],['K29.5','Gastritis kronik tidak spesifik'],['K29.7','Gastritis tidak spesifik'],
      ['K30','Dispepsia gangguan pencernaan fungsional'],
      ['K35','Apendisitis akut'],['K37','Apendisitis tidak spesifik'],
      ['K40','Hernia inguinalis'],['K41','Hernia femoralis'],['K42','Hernia umbilikalis'],['K43','Hernia ventral'],
      ['K50','Crohn enteritis regional'],['K51','Kolitis ulseratif'],['K52','Gastroenteritis non-infektif'],
      ['K56','Obstruksi usus ileus'],['K57','Divertikulosis usus'],['K58','IBS sindroma usus iritabel'],
      ['K59','Konstipasi fungsional'],['K59.0','Konstipasi'],
      ['K60','Fisura fistula anus rektal'],['K61','Abses anus rektal'],
      ['K65','Peritonitis'],
      ['K70','Penyakit hati alkohol'],['K72','Gagal hati'],['K73','Hepatitis kronik'],['K74','Sirosis hati'],['K76','Penyakit hati lainnya'],
      ['K80','Batu empedu kolelitiasis'],['K80.2','Batu kandung empedu tanpa kolesistitis'],['K80.5','Batu duktus biliaris'],
      ['K81','Kolesistitis radang kandung empedu'],['K85','Pankreatitis akut'],['K86','Pankreatitis kronik'],
      ['K92','Perdarahan gastrointestinal hematemesis melena'],['K92.0','Hematemesis'],['K92.1','Melena'],['K92.2','Perdarahan GI tidak spesifik'],
      ['L01','Impetigo'],['L02','Abses bisul furunkel karbunkel'],['L02.9','Bisul tidak spesifik'],
      ['L03','Selulitis'],['L04','Limfadenitis akut'],['L05','Kista pilonidal'],
      ['L08','Infeksi lokal kulit lainnya'],['L08.0','Pioderma'],['L08.1','Eritrasma'],['L08.8','Infeksi kulit lokal lainnya'],['L08.9','Infeksi kulit lokal tidak spesifik'],
      ['L20','Dermatitis atopik eksem'],['L20.9','Dermatitis atopik tidak spesifik'],
      ['L21','Dermatitis seboroik'],['L22','Dermatitis popok'],
      ['L23','Dermatitis kontak alergi'],['L23.9','Dermatitis kontak alergi tidak spesifik'],
      ['L24','Dermatitis kontak iritan'],['L25','Dermatitis kontak tidak spesifik'],
      ['L29','Pruritus gatal'],['L30','Dermatitis lainnya'],
      ['L40','Psoriasis'],['L40.9','Psoriasis tidak spesifik'],
      ['L42','Pitiriasis rosea'],['L43','Liken planus'],
      ['L50','Urtikaria biduran'],['L50.0','Urtikaria alergi'],['L50.9','Urtikaria tidak spesifik'],
      ['L51','Eritema multiforme'],['L52','Eritema nodosum'],
      ['L63','Alopesia areata rambut rontok'],['L64','Alopesia androgenik kebotakan'],
      ['L70','Akne jerawat'],['L70.0','Akne vulgaris'],['L70.9','Akne tidak spesifik'],
      ['L71','Rosasea'],
      ['L80','Vitiligo'],['L81','Gangguan pigmentasi'],['L84','Kapalan kalus'],
      ['L89','Ulkus dekubitus luka tekan'],['L97','Ulkus tungkai'],['L98','Gangguan kulit lainnya'],
      ['M00','Artritis piogenik'],['M02','Artropati reaktif'],
      ['M05','Artritis reumatoid seropositif'],['M06','Artritis reumatoid lainnya'],['M06.9','Artritis reumatoid tidak spesifik'],
      ['M08','Artritis juvenil'],
      ['M10','Gout asam urat artritis gout'],['M10.0','Gout idiopatik'],['M10.9','Gout tidak spesifik'],
      ['M13','Artritis lainnya'],['M13.9','Artritis tidak spesifik'],
      ['M15','Osteoartritis multipel'],['M16','OA panggul koksartritis'],['M17','OA lutut gonoartritis'],['M19','Osteoartritis lainnya'],
      ['M20','Deformitas jari tangan kaki'],['M21','Kelainan bentuk anggota gerak'],['M22','Gangguan patela'],['M23','Gangguan internal lutut'],['M25','Gangguan sendi lainnya'],
      ['M32','Lupus eritematosus sistemik SLE'],['M34','Sklerosis sistemik skleroderma'],['M35','Penyakit jaringan ikat sistemik'],
      ['M40','Kifosis lordosis'],['M41','Skoliosis'],['M45','Spondilitis ankilosa'],['M47','Spondilosis'],
      ['M50','HNP leher gangguan diskus servikal'],['M51','HNP herniated nucleus pulposus'],['M51.1','HNP dengan radikulopati'],['M51.9','HNP tidak spesifik'],
      ['M54','Nyeri punggung dorsalgia'],['M54.2','Nyeri leher servikal'],['M54.3','Iskialgia'],['M54.4','Lumbago dengan iskialgia'],['M54.5','LBP nyeri punggung bawah'],['M54.9','Nyeri punggung tidak spesifik'],
      ['M60','Miositis'],['M62','Gangguan otot lainnya'],
      ['M65','Sinovitis tenosinovitis'],['M67','Gangguan tendon'],
      ['M70','Bursitis gangguan jaringan lunak akibat pemakaian'],['M70.5','Bursitis lutut'],['M70.6','Bursitis trokanterika'],
      ['M75','Lesi bahu frozen shoulder'],['M75.0','Frozen shoulder kapsulitis adhesif'],['M75.1','Rotator cuff syndrome'],
      ['M79','Fibromialgia nyeri jaringan lunak'],['M79.1','Mialgia nyeri otot'],['M79.2','Neuralgia'],['M79.7','Fibromialgia'],['M79.9','Gangguan jaringan lunak tidak spesifik'],
      ['M80','Osteoporosis dengan fraktur'],['M81','Osteoporosis tanpa fraktur'],['M86','Osteomielitis'],['M87','Osteonekrosis'],
      ['N00','Nefritis akut'],['N03','Nefritis kronik'],['N04','Sindroma nefrotik'],
      ['N10','Pielonefritis akut'],['N11','Pielonefritis kronik'],
      ['N17','Gagal ginjal akut AKI'],['N17.9','AKI tidak spesifik'],
      ['N18','Gagal ginjal kronik CKD'],['N18.3','CKD stadium 3'],['N18.5','CKD stadium 5'],['N18.9','CKD tidak spesifik'],
      ['N20','Batu ginjal ureter nefrolitiasis'],['N20.0','Nefrolitiasis batu ginjal'],['N20.1','Ureterolitiasis batu ureter'],
      ['N23','Kolik ginjal'],
      ['N30','Sistitis ISK bawah'],['N30.0','Sistitis akut'],['N30.9','Sistitis tidak spesifik'],
      ['N39','ISK infeksi saluran kemih'],['N39.0','ISK tidak spesifik'],['N39.3','Inkontinensia urin stres'],
      ['N40','BPH hiperplasia prostat'],
      ['N41','Prostatitis'],['N41.0','Prostatitis akut'],['N41.1','Prostatitis kronik'],
      ['N45','Orkitis epididimitis'],['N47','Fimosis'],
      ['N70','Salpingitis ooforitis'],['N71','Endometritis'],['N73','PID penyakit inflamasi pelvis'],
      ['N76','Vaginitis vulvitis'],
      ['N80','Endometriosis'],['N81','Prolaps uteri'],['N83','Kista ovarium'],['N85','Kelainan uterus'],
      ['N91','Amenorea'],['N91.0','Amenorea primer'],['N91.1','Amenorea sekunder'],['N91.2','Amenorea tidak spesifik'],
      ['N92','Menstruasi berlebihan menoragia'],['N93','Perdarahan uterus abnormal'],
      ['N94','Dismenore nyeri haid PMS'],['N94.4','Dismenore primer'],['N94.5','Dismenore sekunder'],['N94.6','Dismenore tidak spesifik'],
      ['N95','Menopause'],
      ['R00','Palpitasi takikardia bradikardia'],['R00.0','Takikardia tidak spesifik'],['R00.1','Bradikardia tidak spesifik'],
      ['R05','Batuk'],
      ['R06','Sesak napas dispnea'],['R06.0','Dispnea sesak napas'],['R06.2','Wheezing mengi'],
      ['R07','Nyeri dada'],['R07.0','Nyeri tenggorok'],['R07.4','Nyeri dada tidak spesifik'],
      ['R10','Nyeri perut abdomen'],['R10.0','Abdomen akut'],['R10.4','Nyeri abdomen tidak spesifik'],
      ['R11','Mual muntah'],['R12','GERD heartburn nyeri ulu hati'],['R13','Disfagia kesulitan menelan'],['R14','Kembung perut gas'],
      ['R17','Ikterus jaundice kuning'],['R18','Asites'],
      ['R20','Gangguan sensasi kulit'],['R21','Ruam kulit'],['R22','Benjolan massa kulit'],
      ['R25','Tremor gerakan involunter'],['R26','Gangguan berjalan'],
      ['R30','Disuria nyeri berkemih'],['R31','Hematuria kencing berdarah'],['R32','Inkontinensia urin'],['R33','Retensi urin'],
      ['R41','Gangguan kognitif'],['R42','Pusing dizziness vertigo'],
      ['R50','Demam tidak diketahui penyebabnya'],['R50.9','Demam tidak spesifik'],
      ['R51','Nyeri kepala sakit kepala cephalgia'],
      ['R52','Nyeri tidak spesifik'],['R52.9','Nyeri tidak spesifik'],
      ['R53','Malaise kelelahan lemas fatigue'],
      ['R55','Pingsan sinkop kolaps'],
      ['R56','Kejang'],['R56.0','Kejang demam'],['R56.8','Kejang tidak spesifik'],
      ['R57','Syok'],['R57.0','Syok kardiogenik'],['R57.1','Syok hipovolemik'],['R57.9','Syok tidak spesifik'],
      ['R60','Edema bengkak'],['R60.0','Edema terlokalisasi'],['R60.9','Edema tidak spesifik'],
      ['R63','Gangguan nafsu makan'],['R63.0','Anoreksia tidak nafsu makan'],['R63.4','Berat badan turun'],
      ['R73','Pra-diabetes gula darah tinggi'],
      ['S06','Cedera kepala intrakranial'],['S06.0','Konkusi gegar otak'],
      ['S22','Fraktur tulang iga sternum'],['S32','Fraktur kolumna lumbalis pelvis'],
      ['S42','Fraktur bahu lengan atas'],['S52','Fraktur lengan bawah'],['S62','Fraktur pergelangan tangan'],
      ['S72','Fraktur femur paha'],['S82','Fraktur tungkai bawah pergelangan kaki'],['S92','Fraktur kaki'],
      ['S83','Sprain lutut'],['S93','Sprain pergelangan kaki keseleo'],
      ['T14','Cedera tidak spesifik'],['T67','Heatstroke heat exhaustion'],['T67.0','Heatstroke sengatan panas'],
      ['T78','Alergi syok anafilaktik'],['T78.0','Syok anafilaktik makanan'],['T78.2','Syok anafilaktik tidak spesifik'],['T78.4','Alergi tidak spesifik'],
      ['Z00','Pemeriksaan umum rutin'],['Z00.0','Pemeriksaan medis umum'],
      ['Z01','Pemeriksaan khusus'],['Z02','Pemeriksaan administrasi'],['Z03','Observasi kondisi dicurigai'],
      ['Z10','Skrining kesehatan rutin'],['Z11','Skrining penyakit infeksi'],['Z12','Skrining kanker'],
      ['Z23','Imunisasi vaksinasi'],['Z29','Profilaksis'],
      ['Z30','Kontrasepsi KB'],['Z34','Pengawasan kehamilan ANC'],
      ['Z50','Rehabilitasi'],['Z54','Konvalesen pemulihan'],
      ['Z71','Konsultasi dan nasihat medis'],['Z71.0','Konseling tanpa keluhan'],['Z71.1','Takut sakit tanpa diagnosis'],['Z71.2','Konsultasi penjelasan hasil pemeriksaan'],['Z71.3','Konsultasi diet'],['Z71.4','Konsultasi alkohol'],['Z71.5','Konsultasi narkoba'],['Z71.6','Konsultasi tembakau'],['Z71.7','Konsultasi obat tradisional'],['Z71.8','Konseling lainnya'],['Z71.9','Konseling tidak spesifik'],
      ['Z73','Masalah gaya hidup stres'],['Z74','Ketergantungan perawatan'],
      ['Z80','Riwayat keluarga kanker'],['Z87','Riwayat pribadi penyakit'],['Z88','Alergi obat'],
      ['Z96','Implan fungsional'],['Z97','Alat bantu'],['Z99','Ketergantungan alat medis'],
    ];

    function icd10Search(val) {
      const dd = document.getElementById('icd10Dropdown');
      if (!dd) return;
      const q = val.trim().toLowerCase();
      if (q.length < 2) { dd.style.display = 'none'; return; }
      // Urutan: kode persis → kode diawali → nama diawali → kode memuat → nama memuat (daftar Indonesia lebih dulu bila setara)
      const skor = function(code, name) {
        const c = code.toLowerCase(), n = name.toLowerCase();
        if (c === q) return 0; if (c.indexOf(q) === 0) return 1; if (n.indexOf(q) === 0) return 2;
        if (c.indexOf(q) !== -1) return 3; if (n.indexOf(q) !== -1) return 4; return -1;
      };
      const results = [];
      _ICD10.forEach(function(x, idx) { const s = skor(x[0], x[1]); if (s >= 0) results.push([s, idx, x]); });
      results.sort(function(a, b) { return a[0] - b[0] || a[1] - b[1]; });
      const hasilPilih = results.slice(0, 40).map(function(r) { return r[2]; });
      if (!hasilPilih.length) { dd.style.display = 'none'; return; }
      dd.innerHTML = hasilPilih.map(([code, name]) =>
        `<div class="icd-item" onclick="icd10Pick('${jsArg(code)} - ${jsArg(name)}',event)"
          style="padding:7px 12px;cursor:pointer;font-size:.83rem;border-bottom:1px solid #f0f0f0;display:flex;gap:8px;align-items:baseline;"
          onmouseover="this.style.background='#e8f5ef'" onmouseout="this.style.background=''"
        ><span style="font-weight:700;color:#1a6b4a;min-width:52px;flex-shrink:0;">${escHtml(code)}</span><span style="color:#333;">${escHtml(name)}</span></div>`
      ).join('');
      dd.style.display = 'block';
      const pertama = dd.querySelector('.icd-item'); if (pertama) pertama.classList.add('active');   // Enter langsung memilih saran teratas
      dd.dataset.nav = '';
    }
    // Papan ketik untuk saran diagnosis: ↑/↓ pindah, Enter pilih, Esc tutup
    function icd10Nav(e) {
      const dd = document.getElementById('icd10Dropdown');
      if (!dd || dd.style.display === 'none') return;
      const items = Array.prototype.slice.call(dd.querySelectorAll('.icd-item'));
      if (!items.length) return;
      let i = items.findIndex(function(x) { return x.classList.contains('active'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        items.forEach(function(x) { x.classList.remove('active'); });
        i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
        items[i].classList.add('active'); items[i].scrollIntoView({ block: 'nearest' });
        dd.dataset.nav = '1';
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (i >= 0) items[i].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } else if (e.key === 'Tab') {
        if (dd.dataset.nav === '1' && i >= 0) { e.preventDefault(); items[i].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
        else dd.style.display = 'none';
      } else if (e.key === 'Escape') { dd.style.display = 'none'; }
    }

    function icd10Pick(val, e) {
      if (e) e.preventDefault();
      const inp = document.getElementById('diagnosis');
      if (inp) { inp.value = val; inp.focus(); }
      const dd = document.getElementById('icd10Dropdown');
      if (dd) dd.style.display = 'none';
    }

    //  SEARCHABLE PM SELECT HELPER (backward compat)
    // ══════════════════════════════════════
    function filterSelectPM(searchInputId, selectId) {
      const q = (document.getElementById(searchInputId)||{}).value || '';
      pmAcFilter(selectId, q);
    }

    // ══════════════════════════════════════
    //  PM AUTOCOMPLETE COMPONENT
    // ══════════════════════════════════════
    function pmAcFilter(selId, q) {
      const drop = document.getElementById(selId + 'Drop');
      const sel  = document.getElementById(selId);
      if (!drop || !sel) return;
      const needle = (q || '').toLowerCase();
      const sorted = [...state.penerima].sort((a, b) => (a.namaPM||'').localeCompare((b.namaPM||''), 'id'));
      const hits = needle
        ? sorted.filter(pm =>
            (pm.namaPM||'').toLowerCase().includes(needle) ||
            (pm.nomorInduk||'').toLowerCase().includes(needle))
        : sorted;
      drop.innerHTML = '';
      if (!hits.length) {
        const empty = document.createElement('div');
        empty.className = 'pm-ac-empty'; empty.textContent = 'Tidak ada PM ditemukan';
        drop.appendChild(empty);
        drop.style.display = 'block'; return;
      }
      hits.slice(0, 40).forEach(pm => {
        const d = document.createElement('div');
        d.className = 'pm-ac-drop-item';
        d.innerHTML = '<span>' + escHtml(pm.namaPM) + '</span>' +
          '<span class="pm-ac-sub">' + escHtml(pm.nomorInduk) +
          (pm.kamarBlok ? ' · ' + escHtml(pm.kamarBlok) : '') + '</span>';
        d.onmousedown = function(e) {
          e.preventDefault();
          // Pastikan opsi ada di select tersembunyi
          let opt = sel.querySelector('option[value="' + pm.nomorInduk + '"]');
          if (!opt) {
            opt = document.createElement('option');
            opt.value = pm.nomorInduk;
            opt.textContent = (pm.namaPM||'-') + ' · ' + pm.nomorInduk;
            sel.appendChild(opt);
          }
          sel.value = pm.nomorInduk;
          const dispEl = document.getElementById(selId + 'Display');
          if (dispEl) dispEl.value = pm.namaPM || '';
          drop.style.display = 'none';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        };
        drop.appendChild(d);
      });
      drop.style.display = 'block';
    }

    function pmAcClose(selId) {
      setTimeout(function() {
        const drop = document.getElementById(selId + 'Drop');
        if (drop) drop.style.display = 'none';
        // Kolom pencarian harus selalu menunjukkan PM yang BENAR-BENAR terpilih. Dulu bila nama
        // diketik tapi tidak dipilih dari daftar, layar menampilkan nama baru sementara data
        // disimpan ke PM sebelumnya. Kolom dikosongkan = pilihan PM dihapus.
        const sel = document.getElementById(selId), disp = document.getElementById(selId + 'Display');
        if (!sel || !disp) return;
        if (!disp.value.trim()) {
          if (sel.value) { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        } else {
          pmAcUpdateDisplay(selId);
        }
      }, 150);
    }

    function pmAcUpdateDisplay(selId) {
      const sel  = document.getElementById(selId);
      const disp = document.getElementById(selId + 'Display');
      if (!sel || !disp) return;
      if (!sel.value) { disp.value = ''; return; }
      const pm = state.penerima.find(p => p.nomorInduk === sel.value);
      if (pm) { disp.value = pm.namaPM || ''; return; }
      const selOpt = sel.options[sel.selectedIndex];
      disp.value = selOpt ? (selOpt.textContent.split(' · ')[0] || '') : '';
    }
