// Función para leer una cookie por su nombre
function getCookie(name) {
    let cookieName = name + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cookieName) == 0) {
            return c.substring(cookieName.length, c.length);
        }
    }
    return "";
}

// Función para crear una cookie
function setCookie(name, value, days) {
    let d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Función para generar un salt aleatorio
function generateSalt(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

// Función para calcular el MD5 (requiere una librería MD5)
function md5(string) {
    // Asegúrate de que la librería MD5 esté incluida en tu HTML
    // Por ejemplo: <script src="https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js"></script>
    if (typeof md5 === 'function') {
        return md5(string);
    } else {
        console.error("La función MD5 no está definida. Asegúrate de incluir la librería MD5.");
        return null;
    }
}

function login(){
    // Verificar si las cookies existen
    let nameCookie = getCookie("name");
    let passCookie = getCookie("pass");
    let saltCookie = getCookie("salt");

    if (nameCookie == "" || passCookie == "" || saltCookie == "") {
        // Mostrar el popup de w2ui
        w2popup.open({
            title   : 'Ingrese sus datos',
            body    : '<div class="w2ui-centered">'+
                    'Nombre: <input id="popupName" class="w2ui-input" type="text"><br>'+
                    'Contraseña: <input id="popupPass" class="w2ui-input" type="password"><br>'+
                    '<button id="popupSubmit" class="w2ui-btn w2ui-btn-blue">Enviar</button>'+
                    '</div>',
            buttons : '',
            onOpen  : function (event) {
                event.onComplete = function () {
                    $('#popupName').w2field('text');
                    $('#popupPass').w2field('password');

                    $('#popupSubmit').on('click', function() {
                        let name = $('#popupName').val();
                        let password = $('#popupPass').val();

                        // Generar el salt
                        let salt = generateSalt(5);

                        // Calcular el hash MD5
                        let hash = md5(password + salt);

                        if (hash) {
                            // Enviar los datos al servidor vía GET
                            let url = `?u=${encodeURIComponent(name)}&t=${hash}&s=${salt}`;
                            window.location.href = url;

                            // Guardar los datos en cookies
                            setCookie("name", name, 30); // 30 días
                            setCookie("pass", hash, 30); // 30 días
                            setCookie("salt", salt, 30); // 30 días

                            w2popup.close();
                        } else {
                            alert("Error al calcular el hash MD5.");
                        }
                    });
                }
            }
        });
    } else {
        console.log("Cookies encontradas: Nombre = " + nameCookie + ", Pass = " + passCookie + ", Salt = " + saltCookie);
        // Aquí puedes realizar acciones si las cookies ya existen
    }
}