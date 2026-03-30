# Checklist: Monitoring stavu řídicí jednotky spotřebičů

## Základní úkoly
- [ ] **Sběr dat:** Zprovoznit čtení z proudových senzorů ACS 712 a analogového senzoru DC napětí.
- [ ] **Stav stykače:** Implementovat snímání stavu kontaktů hlavního stykače.
- [X] **Lokální displej:** Zobrazit naměřené hodnoty na grafickém LCD připojeném k Arduinu UNO R4 WiFi.
- [ ] **Bezdrátový přenos:** Nastavit WiFi komunikaci mezi Arduinem (odesílatel) a Raspberry Pi 4 (příjemce).
- [ ] **Webový server:** Vytvořit webovou stránku hostovanou na Raspberry Pi 4 zobrazující aktuální data.
- [X] **Síťové nastavení:** Konfigurovat Ethernet na RPi s IP `10.250.1.x/24` (dle čísla týmu) a bránou `10.250.1.1`.

## Challenge (Bonusové úkoly)
- [ ] **Real-time update:** Zajistit automatickou aktualizaci hodnot na webu bez nutnosti obnovy stránky.
- [ ] **Historie a CSV:** Implementovat ukládání historie měření a funkci pro export do formátu CSV.
- [ ] **Vizualizace:** Vytvořit grafické znázornění (grafy) naměřených hodnot a jejich historie.
- [X] **Zabezpečení WiFi:** Zabezpečit interní komunikaci mezi Arduinem a Raspberry Pi.
- [ ] **HTTPS protokol:** Šifrovat komunikaci mezi klientským PC a RPi pomocí HTTPS.
- [ ] **Důvěryhodné certifikáty:** Vygenerovat certifikáty tak, aby prohlížeč nehlásil chybu zabezpečení.
- [X] **Autorizace:** Omezit přístup k webové stránce pomocí uživatelského jména a hesla.
- [X] **Firewall:** Nastavit pravidla firewallu na RPi (povolit pouze nezbytné porty pro služby).