<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Переход на новый адрес</title>
<meta name="robots" content="noindex">
</head>
<body>
<p>Страница переехала. Если переход не произошёл, воспользуйтесь
<a href="/">главной страницей</a>.</p>
<script>
/* Хостинг без mod_rewrite не умеет разбирать ?page=... на стороне сервера,
   поэтому переводим на новый адрес здесь. */
var ROUTES = {
  "arefev-a-s": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/arefev-a-s/",
  "ashirova-i-v": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/ashirova-i-v/",
  "blanki-zayavlenij": "/obrazovanie/studentam-diplomnikam/blanki-zayavlenij/",
  "bzhd": "/obrazovanie/uchebnye-materialy/bzhd/",
  "chernysh-m-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/chernysh-m-a/",
  "dokumen-ty": "/dokumen-ty/",
  "dostizheniya": "/dostizheniya/",
  "elektrodinamicheskie-distsipliny": "/obrazovanie/uchebnye-materialy/elektrodinamicheskie-distsipliny/",
  "elektrodinamika-i-rasprostranenie-radiovoln": "/obrazovanie/uchebnye-materialy/elektrodinamicheskie-distsipliny/elektrodinamika-i-rasprostranenie-radiovoln/",
  "elektromagnitnye-polya-i-volny": "/obrazovanie/uchebnye-materialy/elektrodinamicheskie-distsipliny/elektromagnitnye-polya-i-volny/",
  "elektronika": "/obrazovanie/uchebnye-materialy/tsikl-elektronika/elektronika/",
  "elektronika-i-mikroprotsessornaya-tehnika": "/obrazovanie/uchebnye-materialy/tsikl-elektronika/elektronika-i-mikroprotsessornaya-tehnika/",
  "elektrotehnika-i-elektronika": "/obrazovanie/uchebnye-materialy/elektrotehnika-i-elektronika/",
  "fizicheskie-osnovy-elektroniki": "/obrazovanie/uchebnye-materialy/tsikl-elektronika/fizicheskie-osnovy-elektroniki/",
  "home": "/",
  "istoriya-elektrodinamiki": "/istoriya-elektrodinamiki/",
  "istoriya-kafedry": "/svedeniya-o-kafedre/istoriya-kafedry/",
  "klyuev-d-s": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/klyuev-d-s/",
  "kontakty": "/kontakty/",
  "kubanov-v-p": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/kubanov-v-p/",
  "kuzmenko-a-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/kuzmenko-a-a/",
  "lozhkin-l-d": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/lozhkin-l-d/",
  "machihin-v-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/machihin-v-a/",
  "majorov-a-g": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/majorov-a-g/",
  "mediakontent": "/mediakontent/",
  "mogila-e-d": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/mogila-e-d/",
  "morozov-s-v": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/morozov-s-v/",
  "nagrady": "/dostizheniya/nagrady/",
  "neganov-v-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/neganov-v-a/",
  "obrazovanie": "/obrazovanie/",
  "osipov-o-v": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/osipov-o-v/",
  "osnovy-elektromagnitnoj-sovmestimosti": "/obrazovanie/uchebnye-materialy/osnovy-elektromagnitnoj-sovmestimosti/",
  "prezentatsiya-kafedry": "/dokumen-ty/prezentatsiya-kafedry/",
  "professorsko-prepodavatelskij-sostav": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/",
  "publikatsii-kafedry": "/dostizheniya/publikatsii-kafedry/",
  "rabochie-programmy": "/dokumen-ty/rabochie-programmy/",
  "raspisanie-zanyatij": "/obrazovanie/raspisanie-zanyatij/",
  "rasprostranenie-radiovoln-i-antenno-fidernye-ustrojstva": "/obrazovanie/uchebnye-materialy/rasprostranenie-radiovoln-i-antenno-fidernye-ustrojstva/",
  "ruzhnikov-v-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/ruzhnikov-v-a/",
  "sarokvasha-oksana-yurevna": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/sarokvasha-oksana-yurevna/",
  "sitnikova-s-v": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/sitnikova-s-v/",
  "slipenchuk-k-s": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/slipenchuk-k-s/",
  "sokolova-yu-v": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/sokolova-yu-v/",
  "soldatov-a-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/soldatov-a-a/",
  "spravochno-informatsionnye-materialy": "/dokumen-ty/spravochno-informatsionnye-materialy/",
  "studentam-diplomnikam": "/obrazovanie/studentam-diplomnikam/",
  "svedeniya-o-kafedre": "/svedeniya-o-kafedre/",
  "svedeniya-o-personalnom-sostave": "/svedeniya-o-kafedre/svedeniya-o-personalnom-sostave/",
  "svedeniya-o-sotrudnikah": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/",
  "tabakov-d-p": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/tabakov-d-p/",
  "temy-2017-2018-uch-god": "/obrazovanie/studentam-diplomnikam/temy-diplomnyh-rabot/temy-2017-2018-uch-god/",
  "temy-diplomnyh-rabot": "/obrazovanie/studentam-diplomnikam/temy-diplomnyh-rabot/",
  "temy-diplomnyh-rabot-na-2018-2019-god": "/obrazovanie/studentam-diplomnikam/temy-diplomnyh-rabot/temy-diplomnyh-rabot-na-2018-2019-god/",
  "tsikl-elektronika": "/obrazovanie/uchebnye-materialy/tsikl-elektronika/",
  "uchebno-vspomogatelnyj-personal": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/uchebno-vspomogatelnyj-personal/",
  "uchebnye-materialy": "/obrazovanie/uchebnye-materialy/",
  "voronoj-a-a": "/svedeniya-o-kafedre/svedeniya-o-sotrudnikah/professorsko-prepodavatelskij-sostav/voronoj-a-a/",
  "vypuskniki-kafedry": "/dostizheniya/vypuskniki-kafedry/"
};
var alias = new URLSearchParams(location.search).get("page");
var target = (alias && ROUTES[alias]) || "/";
location.replace(target);
</script>
</body>
</html>
