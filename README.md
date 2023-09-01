# Fingerprintv2

# ВНИМАНИЕ! ОТПЕЧАТОК ЭТО ОЧЕНЬ ВАЖНАЯ ИНФОРМАЦИЯ, НЕ РАСПРОСТРАНЯЙТЕ ЕЕ БЕЗ НЕОБХОДИМОСТИ И НЕ ПЕРЕДАВАЙТЕ НЕЗНАКОМЫМ ПОЛЬЗОВАТЕЛЯМ

![ ]( /src/icon_128.png )

## Простой плагин для экспорта/импорта отпечатка браузера

Плагин снимает localStorage, sessionStorage и Cookies из исходного браузера и
позволяет вставить их в другой, при этом так же будет подделан User-Agent.

Однако некоторые сайты используют более глубокую идентификацию и детектирование,
например IndexedDB таблицы, их внедрение пока не рассматривается,
но в будущем возможно будем переносить и их.

![ ]( /src/screenshot.png )

## Как использовать

* Все устройства должны иметь один IP
* Установите плагин на оба браузера(или более)
* Произведите логин в исходном браузере
* Снимите отпечаток нажав второй кнопкой мыши и экспортируйте в буфер обмена или файл
* Передайте содержимое буфера или файл на компьютеры, на которых требуется воспроизвести оптечаток
* Импортируйте
* Перезагрузите страницу - плагин попытается перезагрузить страницу через секунду после импорта

* Если требуется сбросить User-Agent - выберите в контекстом меню "Clear User-Agent override"

[![ ](https://img.youtube.com/vi/4D3cqQ7bn0Y/default.jpg)](https://youtu.be/4D3cqQ7bn0Y)
