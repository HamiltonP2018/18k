/**
 * Curaduría de fotos y videos
 * ---------------------------------------------------------------------------
 * Aquí se cambian las leyendas, los álbumes y qué fotos aparecen en cada parte
 * de la página. Los ids son los del manifiesto (`media.generated.json`).
 *
 *  - caption:   leyenda corta (galería, visor, carrusel).
 *  - alt:       descripción para lectores de pantalla.
 *  - focal:     punto focal [x%, y%] para los recortes (dónde están las caras).
 *  - album:     álbum de la galería.
 *  - sensitive: fotos más íntimas: solo se ven dentro de la galería,
 *               nunca en la portada, la intro, el carrusel ni el mosaico.
 *  - hidden:    no aparece en ninguna parte (duplicados, recortes).
 *
 * Los giros de las fotos que venían de lado y las fechas de las fotos de
 * Snapchat están en `media-src/overrides.json`.
 */

export interface Album {
  id: string
  title: string
  subtitle: string
  description?: string
  /** id de la foto de portada del álbum. */
  cover?: string
}

export const albums = [
  {
    id: 'comienzos',
    title: 'Nuestros comienzos',
    subtitle: 'Mayo – octubre 2026',
    description: 'Parques, flores y las primeras fotos de los dos.',
    cover: 'orig-26',
  },
  {
    id: 'promesa',
    title: 'El sábado de la promesa',
    subtitle: '14 de noviembre',
    description: 'Arreglados en casa, un anillo y una pared rosa llena de risas.',
    cover: 'snapchat-982995529',
  },
  {
    id: 'navidad',
    title: 'Navidad adelantada',
    subtitle: '15 de noviembre',
    description: 'Renos, una terraza con montañas, cine, helado y maquinitas.',
    cover: 'snapchat-1417529378',
  },
  {
    id: 'despues',
    title: 'Lo que quedó',
    subtitle: '16 – 17 de noviembre',
    description: 'Fotos que viajan, flores y detalles con nuestra fecha.',
    cover: 'img-20261116-wa0148',
  },
] as const satisfies readonly Album[]

export type AlbumId = (typeof albums)[number]['id']

export interface PhotoMeta {
  caption?: string
  alt?: string
  focal?: [number, number]
  album?: AlbumId
  sensitive?: boolean
  hidden?: boolean
}

export interface VideoMeta {
  title?: string
  alt?: string
  focal?: [number, number]
  sensitive?: boolean
  hidden?: boolean
}

export const photoMeta: Record<string, PhotoMeta> = {
  'orig-01': { caption: 'Mi lugar favorito', alt: 'Ramo de rosas rojas con nube rosada, envuelto en papel crema con una mariposa dorada, sobre la cama.', focal: [45, 52], album: 'comienzos' },
  'orig-02': { caption: 'Sonrisas compartidas', alt: 'Ella sonríe abrazando un ramo de rosas rosadas, con vestido floral, frente a una pared decorada con flores de papel.', focal: [35, 37], album: 'comienzos' },
  'orig-04': { caption: 'Nuestro secreto favorito', alt: 'Ella recostada sobre un gran oso de peluche café, con labios rojos y blusa floral, mirando a la cámara.', focal: [65, 54], album: 'comienzos', sensitive: true },
  'orig-05': { caption: 'Contigo, siempre', alt: 'Ella acostada junto a un oso de peluche, con blusa negra y labios rojos, lanzando un beso a la cámara.', focal: [52, 35], album: 'comienzos', sensitive: true },
  'orig-06': { caption: 'Locos de amor', alt: 'Él sonríe ampliamente en una selfie, con camiseta negra, dentro de un apartamento con ventilador y puertas de madera.', focal: [49, 38], album: 'comienzos' },
  'orig-07': { caption: 'Como el primer día', alt: 'Ella se toma una foto en el espejo con vestido negro; el celular cubre su rostro y detrás hay un gran oso rosado.', focal: [59, 48], album: 'comienzos', sensitive: true },
  'orig-08': { caption: 'Tú y yo, para siempre', alt: 'La pareja recostada en la cama; él sonríe y ella se asoma detrás de un cerdito de peluche rosado.', focal: [60, 42], album: 'comienzos' },
  'orig-09': { caption: 'Eres mi hogar', alt: 'Primer plano de un ramo con rosas rosadas, una rosa crema, un crisantemo amarillo y nube blanca.', focal: [53, 50], album: 'comienzos' },
  'orig-10': { caption: 'Mi persona favorita', alt: 'Ramo de rosas rosadas y crema, claveles y crisantemos amarillos envuelto en papel dorado y negro, con una tarjeta.', focal: [55, 68], album: 'comienzos' },
  'orig-11': { caption: 'Aventuras contigo', alt: 'Ramo pastel de rosas, claveles y crisantemos amarillos en papel dorado y negro, sobre un fondo oscuro.', focal: [55, 68], album: 'comienzos', hidden: true },
  'orig-12': { caption: 'El destino nos unió', alt: 'Un helado en tarro y una caja de bombones sobre una alfombra colorida, frente a un peluche vestido de rojo.', focal: [50, 47], album: 'comienzos' },
  'orig-13': { caption: 'Un instante, mil recuerdos', alt: 'Ella acostada abraza un cerdito de peluche y lanza un beso, con moño rojo en el cabello; sticker de un perrito.', focal: [50, 26], album: 'comienzos' },
  'orig-14': { caption: 'Miradas que hablan', alt: 'Ella recostada sobre un oso de peluche café, con blusa negra, delineado marcado y labios rojos.', focal: [44, 34], album: 'comienzos', sensitive: true },
  'orig-15': { caption: 'Corazón en calma', alt: 'Ilustración animada de la pareja: ella besa su mejilla mientras él sonríe en un parque soleado bajo un árbol.', focal: [53, 33], album: 'comienzos' },
  'orig-16': { caption: 'Katherine, mi universo', alt: 'Ilustración animada de la pareja: él besa su mejilla y ella hace un puchero, con un anillo dorado en la mano.', focal: [47, 51], album: 'comienzos' },
  'orig-18': { caption: 'Mi razón de sonreír', alt: 'Ella recostada con maquillaje de telaraña en el rostro, blusa roja y labios rojos, sobre un oso de peluche.', focal: [47, 30], album: 'comienzos', sensitive: true },
  'orig-20': { caption: 'Cómplices de vida', alt: 'Ella lanza un beso, sentada con un ramo de rosas rosadas y una blanca; detrás, flores de papel y un oso rosado.', focal: [33, 47], album: 'comienzos' },
  'orig-21': { caption: 'Para toda la vida', alt: 'Collage de girasoles con margaritas lilas y amarillas, y un cerdito de peluche rosado sostenido por dos manos.', focal: [50, 50], album: 'comienzos' },
  'orig-22': { caption: 'Amor que crece', alt: 'La pareja se toma una selfie bajo árboles con flores lilas y cielo azul; ella con blusa rosada, él con camiseta beige.', focal: [50, 49], album: 'comienzos' },
  'orig-23': { caption: 'Nada es casualidad', alt: 'Las manos de la pareja entrelazadas, con anillos y pulseras plateadas, sentados sobre el césped de un parque soleado.', focal: [49, 49], album: 'comienzos' },
  'orig-24': { caption: 'Sin fecha de caducidad', alt: 'Ella recostada sobre un oso de peluche, con top rojo de encaje y camisa blanca, lanzando un beso; sticker de un perrito.', focal: [57, 46], album: 'comienzos', sensitive: true },
  'orig-26': { caption: 'Mi mejor decisión', alt: 'Ella lo abraza por el cuello y le besa la mejilla en una selfie, en un parque soleado con árboles y cielo azul.', focal: [55, 37], album: 'comienzos' },
  'orig-29': { caption: 'Gracias por existir', alt: 'Ella lo abraza de espaldas a la cámara; él apoya su rostro en ella y sonríe, en un parque con árboles.', focal: [60, 34], album: 'comienzos' },
  'orig-30': { caption: 'Contigo todo es mejor', alt: 'La pareja sonríe en una selfie bajo árboles con flores lilas y cielo azul; él con una gran sonrisa, ella con blusa rosada.', focal: [52, 49], album: 'comienzos' },
  'orig-31': { caption: 'Mi paz, mi calma', alt: 'Selfie de la pareja en un parque soleado; ella con vestido rosa y collar de corazón, él con camiseta gris y una gran sonrisa.', focal: [64, 36], album: 'comienzos' },
  'orig-32': { caption: 'Te amo, hoy y siempre', alt: 'Selfie de la pareja en casa; ella lo abraza por el cuello, con labios rojos y anillo dorado; él con camiseta negra.', focal: [58, 33], album: 'comienzos' },
  'img-20261114-152534-336': { caption: 'Acurrucados, sin prisa', alt: 'La pareja recostada sobre una almohada de flores; ella sonríe con la mejilla pegada a la cabeza de él.', focal: [47, 38], album: 'promesa', sensitive: true },
  'img-20261114-154446-762': { caption: 'La flor en tu cabello', alt: 'Selfie en el espejo: él sostiene el celular que tapa el rostro de ella, que lleva una flor naranja en el cabello.', focal: [60, 37], album: 'promesa' },
  'img-20261114-154528-882': { caption: 'Abrazados frente al espejo', alt: 'Selfie de medio cuerpo en el espejo; ella abraza a él por la cintura y lleva una flor naranja en el cabello.', focal: [50, 47], album: 'promesa' },
  'img-20261114-154531-284': { caption: 'Dos reflejos, un latido', alt: 'Casi la misma selfie en el espejo: la pareja abrazada frente a una puerta de madera oscura.', focal: [51, 46], album: 'promesa' },
  'img-20261114-154537-991': { caption: 'Tu mirada me desarma', alt: 'Selfie de la pareja frente a una puerta de madera; ella con labios rojos y delineado, él con camiseta negra.', focal: [50, 40], album: 'promesa' },
  'img-20261114-154540-693': { caption: 'Mejilla con mejilla', alt: 'Selfie mejilla con mejilla; ella hace un gesto de beso y lleva una flor en el cabello, él sonríe con suavidad.', focal: [63, 42], album: 'promesa' },
  'img-20261114-154600-537': { caption: 'Así nos vemos juntos', alt: 'Selfie horizontal en el espejo de una sala blanca; él asoma los ojos sobre el celular y ella se apoya en él.', focal: [62, 49], album: 'promesa' },
  'img-20261114-154604-751': { caption: 'Un beso tras la cámara', alt: 'En el espejo, la pareja se besa detrás del celular, en una sala blanca con una puerta negra al fondo.', focal: [60, 55], album: 'promesa' },
  'img-20261114-154605-609': { caption: 'Besos que nadie ve', alt: 'Variante de la foto anterior: la pareja se besa oculta tras el celular frente al espejo.', focal: [59, 55], album: 'promesa' },
  'img-20261114-154632-561': { caption: 'Un cuadro de los dos', alt: 'Espejo enmarcado sobre papel tapiz de hojas; en el reflejo él sonríe con los ojos cerrados y ella se asoma tras él.', focal: [42, 42], album: 'promesa' },
  'img-20261114-154639-271': { caption: 'Asomada a mi hombro', alt: 'El mismo espejo enmarcado; ella se asoma tras el hombro de él mientras él toma la foto.', focal: [45, 43], album: 'promesa' },
  'img-20261114-154814-793': { caption: 'Tu mitad del corazón', alt: 'Él recostado con los ojos cerrados y una sonrisa; la mano de ella, con uñas rojas, forma medio corazón junto a su mejilla.', focal: [32, 46], album: 'promesa' },
  'img-20261114-155018-962': { caption: 'Una promesa en tus manos', alt: 'Las manos de ella forman un corazón alrededor de un estuche rojo de anillo, abierto e iluminado, sobre una sábana floral.', focal: [53, 45], album: 'promesa' },
  'img-20261114-155108-085': { caption: 'Brilla como lo nuestro', alt: 'Primer plano de un anillo plateado con una piedra brillante dentro de un estuche rojo iluminado.', focal: [44, 48], album: 'promesa' },
  'img-20261114-155141-756': { caption: 'Tan cerquita de ti', alt: 'Selfie de la pareja recostada muy junta; ella con flor en el cabello y labios rojos, él detrás mirando a la cámara.', focal: [57, 45], album: 'promesa', sensitive: true },
  'img-20261115-100557-378': { caption: 'Los renos nos esperaban', alt: 'Decoración navideña en un centro comercial: dos renos de peluche en un establo rojo con guirnaldas y regalos.', focal: [45, 40], album: 'navidad' },
  'img-20261115-100711-973': { caption: 'Noviembre vestido de Navidad', alt: 'Árbol de Navidad con esferas rojas y doradas junto a renos de peluche y cajas de regalo en un centro comercial.', focal: [45, 45], album: 'navidad' },
  'img-20261115-100744-861': { caption: 'Felices junto al árbol', alt: 'Selfie de la pareja sonriente frente a un árbol de Navidad y renos decorativos en un centro comercial.', focal: [41, 55], album: 'navidad', hidden: true },
  'img-20261115-100746-389': { caption: 'Navidad adelantada contigo', alt: 'Selfie navideña: él sonríe ampliamente y ella hace un gesto de beso frente al árbol y los renos.', focal: [40, 62], album: 'navidad' },
  'img-20261115-101525-048': { caption: 'Bajo un cielo de esferas', alt: 'Atrio de un centro comercial con techo de vidrio y grandes esferas navideñas rojas y doradas colgando.', focal: [55, 40], album: 'navidad' },
  'img-20261115-102749-674': { caption: 'Mesa para dos', alt: 'Comida en una mesa redonda de madera: arroz con carne y papa, sopa de pollo y una gaseosa rosada.', focal: [48, 68], album: 'navidad' },
  'img-20261115-102752-278': { caption: 'El sabor de estar juntos', alt: 'Manos con anillo y pulsera comiendo arroz con carne junto a una sopa de pollo y un vaso de caldo.', focal: [47, 68], album: 'navidad' },
  'img-20261115-102759-530': { caption: 'Colores de nuestra mañana', alt: 'Mural rojo con un guitarrista, una bailarina de falda amplia y un ciclista sobre una zona de comidas con mesas vacías', focal: [45, 45], album: 'navidad' },
  'img-20261115-170719-274': { caption: 'Tu mano sobre la mía', alt: 'La mano de ella, con uñas rojas y un anillo de solitario, descansa sobre la mano de él dentro de un auto', focal: [55, 36], album: 'navidad' },
  'img-20261116-wa0147': { caption: 'Un beso que viaja hasta mí', alt: 'Ella recostada sobre un oso de peluche gigante, con delineado, labios rojos y gesto de beso, en tonos fríos', focal: [53, 38], album: 'despues', sensitive: true },
  'img-20261116-wa0148': { caption: 'Más linda que las flores', alt: 'Ella sostiene un ramo con girasol, rosas rojas y claveles en papel rosa, frente a una pared con flores de papel', focal: [33, 45], album: 'despues' },
  'img-20261116-wa0150': { caption: 'Nuestro fin de semana juntos', alt: 'Collage del fin de semana de la pareja: selfies, el anillo en su estuche, flores, helados, un pastel y horas sobreimpresas', focal: [50, 45], album: 'despues' },
  'img-20261116-wa0153': { caption: 'Nuestras manos encajan', alt: 'Manos unidas palma con palma: él con tatuaje de dos bandas y pulsera, ella con uñas rojas y anillo', focal: [60, 46], album: 'despues' },
  'img-20261116-wa0155': { caption: 'Tus labios, mi debilidad', alt: 'Ella recostada en un oso de peluche, con el brazo sobre la cabeza y labios rojos en gesto de beso', focal: [56, 38], album: 'despues', sensitive: true },
  'img-20261116-wa0156': { caption: 'Entre peluches y besitos', alt: 'Ella sobre un oso de peluche gigante, con la mano en la cabeza, labios rojos y mirada a la cámara', focal: [57, 40], album: 'despues', sensitive: true },
  'img-20261116-wa0157': { caption: 'Esa mirada es solo mía', alt: 'Ella recostada en un oso de peluche café, con un anillo en la mano y gesto de beso, en tonos fríos', focal: [52, 38], album: 'despues', sensitive: true },
  'snapchat-5042446': { caption: 'Entre luces y maquinitas', alt: 'Sala de videojuegos con máquinas de carreras de motos y luces en el techo; la foto está girada de lado', focal: [48, 60], album: 'navidad' },
  'snapchat-14375262': { caption: 'Domingo de manos unidas', alt: 'Foto en blanco y negro de sus brazos y manos entrelazadas sobre piso de madera, con la hora 11:14 en rojo', focal: [68, 40], album: 'navidad' },
  'snapchat-21002717': { caption: 'Tu anillo en mi mano', alt: 'La mano de ella con anillo de solitario y uñas rojas sobre la palma de él, encima de su pantalón verde oliva', focal: [57, 47], album: 'promesa' },
  'snapchat-50302668': { caption: 'Dos besos, un corazón', alt: 'La pareja junta frente a una pared rosa con rayas, ambos con gesto de beso y un corazón rojo decorativo', focal: [64, 47], album: 'promesa' },
  'snapchat-245639667': { caption: 'Dos asientos, tú y yo', alt: 'Simulador naranja de dos asientos en una sala de juegos con techo de estructura metálica', focal: [32, 58], album: 'navidad' },
  'snapchat-315219591': { caption: 'De cabeza por ti', alt: 'Selfie de lado de la pareja frente a la pared rosa: él con un dedo en los labios y ella con gesto de beso', focal: [52, 47], album: 'promesa' },
  'snapchat-363237569': { caption: 'Pollo, papitas y tú', alt: 'Bandeja de comida rápida con pollo apanado, papas fritas, dos bebidas y una botella de agua', focal: [50, 45], album: 'navidad' },
  'snapchat-396721547': { caption: 'Abrazo bajo las palmeras', alt: 'Él sonríe abrazado a ella, que está de espaldas, en una terraza soleada con palmeras en macetas', focal: [54, 50], album: 'navidad' },
  'snapchat-409500696': { caption: 'Florecemos juntos', alt: 'La pareja frente a una pared rosa; ella hace gesto de beso y un filtro añade lirios rosados en las esquinas', focal: [64, 42], album: 'promesa' },
  'snapchat-410079293': { caption: 'Palomitas y tu carita', alt: 'Ella sentada a una mesa con un balde de palomitas, un vaso y agua, haciendo un gesto pícaro', focal: [66, 32], album: 'navidad' },
  'snapchat-428098045': { caption: 'Volvamos a ser niños', alt: 'Zona de juegos con simuladores de carreras amarillos y un parque infantil de tubos rojos; foto de lado', focal: [50, 60], album: 'navidad' },
  'snapchat-476472561': { caption: 'Navidad temprana a tu lado', alt: 'Centro comercial con techo de vidrio y enormes esferas navideñas rojas y doradas colgando; foto de lado', focal: [45, 38], album: 'navidad' },
  'snapchat-480374076': { caption: 'Un mundo para los dos', alt: 'Retrato de la pareja dentro de un marco circular, juntos y serenos frente a la pared rosa; foto de lado', focal: [55, 39], album: 'promesa' },
  'snapchat-495190854': { caption: 'Contigo me río así', alt: 'Él ríe con una gran sonrisa y ella, a su lado, hace gesto de beso; fondo tapizado beige', focal: [70, 48], album: 'navidad' },
  'snapchat-528239701': { caption: 'Tu abrazo, mi lugar seguro', alt: 'Él guiña un ojo abrazado a ella, de espaldas, en una terraza con palmeras y montañas al fondo', focal: [35, 46], album: 'navidad' },
  'snapchat-555295741': { caption: 'Entre lirios y besos', alt: 'La pareja en una selfie con filtro de lirios rosados; ella lanza un beso y él apoya la mano en la barbilla.', focal: [60, 50], album: 'promesa' },
  'snapchat-557283471': { caption: 'Helado a tu lado', alt: 'Dos vasitos de helado rosado con cucharas rojas sobre un mostrador blanco.', focal: [50, 52], album: 'navidad' },
  'snapchat-566884311': { caption: 'Tu abrazo, mi refugio', alt: 'Selfie en blanco y negro frente al espejo; ella abraza a él y asoma tras el celular. Texto: 4:06, sábado 14 de noviembre.', focal: [61, 36], album: 'promesa' },
  'snapchat-657860156': { caption: 'Sonrío cuando estás cerca', alt: 'Selfie en el espejo con marco circular; él sonríe con los ojos cerrados junto a ella, que cubre su rostro con el celular.', focal: [48, 48], album: 'promesa' },
  'snapchat-665361379': { caption: 'Juntos y combinados', alt: 'La pareja, vestida de negro, se toma una selfie en el espejo de un pasillo con letrero de baño familiar.', focal: [45, 31], album: 'navidad' },
  'snapchat-669948751': { caption: 'Créditos finales, amor sin final', alt: 'En una sala de cine, la mano de ella con un anillo y uñas rojas descansa sobre la mano abierta de él.', focal: [48, 48], album: 'navidad' },
  'snapchat-689074082': { caption: 'Blanco y negro, amor a color', alt: 'Selfie en blanco y negro: él recuesta la cabeza sobre ella, que lleva una flor en el cabello. Texto: 3:57, sábado 14 de noviembre.', focal: [66, 51], album: 'promesa' },
  'snapchat-744449132': { caption: 'Un sábado para recordar', alt: 'Otra toma en blanco y negro de la pareja recostada, con el texto 3:57 y la fecha sábado 14 de noviembre.', focal: [68, 52], album: 'promesa' },
  'snapchat-844507608': { caption: 'Besitos y corazones', alt: 'Selfie de la pareja frente a una pared rosa y celeste; ella lanza un beso con labios rojos junto a un sticker de corazón.', focal: [62, 48], album: 'promesa' },
  'snapchat-854535595': { caption: 'Mis ojos solo te buscan', alt: 'Selfie en el espejo: él la mira con ternura mientras ella cubre su rostro con el celular.', focal: [40, 46], album: 'promesa' },
  'snapchat-901807615': { caption: 'Nuestro pequeño mundo', alt: 'Selfie de lado dentro de un marco circular; él mira a la cámara y ella hace un beso con labios rojos.', focal: [50, 50], album: 'promesa' },
  'snapchat-932758051': { caption: 'Risas entre flores', alt: 'La pareja ríe abrazada en una selfie con filtro de lirios rosados frente a una pared rosa.', focal: [76, 40], album: 'promesa' },
  'snapchat-935324724': { caption: 'Pegaditos, como me gusta', alt: 'Selfie de lado con poca luz; él sonríe levemente y ella hace un beso, con un pasador lila en el cabello.', focal: [62, 54], album: 'navidad' },
  'snapchat-982545511': { caption: 'Dos gatitos que brillan', alt: 'La pareja con un filtro de gatitos brillantes con moños rojos frente a una pared rosa geométrica.', focal: [68, 53], album: 'promesa' },
  'snapchat-982995529': { caption: 'Felicidad en dos sonrisas', alt: 'La pareja sonríe ampliamente en una selfie frente a una pared rosa con franjas blancas; ella lleva labios rojos.', focal: [68, 42], album: 'promesa' },
  'snapchat-999424719': { caption: 'Tus ojitos, mi debilidad', alt: 'Selfie en blanco y negro frente al espejo; los ojos de ella asoman sobre el celular. Texto: 4:06, sábado 14 de noviembre.', focal: [58, 39], album: 'promesa' },
  'snapchat-1003124669': { caption: 'La eternidad en tu mirada', alt: 'Edición con un recorte de los rostros de la pareja, moños rosados y una frase en inglés sobre la eternidad.', focal: [50, 41], album: 'promesa' },
  'snapchat-1007341462': { caption: 'Más bonita que la Navidad', alt: 'Ella se toma una selfie inclinada en un centro comercial con reno, guirnaldas y regalos navideños.', focal: [59, 57], album: 'navidad' },
  'snapchat-1032338464': { caption: 'Te escondes y te encuentro', alt: 'Selfie con grano de película; él mira a la cámara y ella se cubre el rostro con un celular naranja.', focal: [64, 48], album: 'comienzos' },
  'snapchat-1057492413': { caption: 'Tu labial rojo me enamora', alt: 'Selfie de la pareja frente a la pared rosa; él sonríe tranquilo y ella posa con labios rojos y una flor en el cabello.', focal: [69, 43], album: 'promesa' },
  'snapchat-1059941455': { caption: 'Mi sonrisa tiene tu nombre', alt: 'Él sonríe y ella posa con labios rojos y una flor en el cabello en una selfie frente a una pared rosa geométrica.', focal: [68, 42], album: 'promesa' },
  'snapchat-1092309856': { caption: 'Ojos cerrados, corazón abierto', alt: 'Selfie en el espejo con marco circular; él se acerca a ella con los ojos cerrados mientras ella sostiene el celular.', focal: [38, 50], album: 'promesa' },
  'snapchat-1115174177': { caption: 'Rosa, como lo nuestro', alt: 'Selfie inclinada de la pareja bajo una pared rosa con franjas blancas; él sonríe y ella posa con labios rojos.', focal: [76, 52], album: 'promesa' },
  'snapchat-1138945585': { caption: 'Recostados y sin prisa', alt: 'Selfie de lado con tono cálido; él sonríe ampliamente junto a ella, que lleva labios rojos y una flor en el cabello.', focal: [66, 54], album: 'promesa' },
  'snapchat-1168848582': { caption: 'Con la ciudad a nuestros pies', alt: 'Selfie de la pareja en una azotea soleada; ella apoya la cabeza en el hombro de él, con montañas y ciudad al fondo.', focal: [52, 52], album: 'navidad' },
  'snapchat-1210958723': { caption: 'Tu puchero, mi sonrisa', alt: 'Selfie en blanco y negro, de lado: él sonríe y ella hace un gesto de beso; texto rojo 11:51, domingo 15 de noviembre.', focal: [63, 60], album: 'navidad' },
  'snapchat-1247366724': { caption: 'Tu reflejo junto al mío', alt: 'Selfie en el espejo: ella cubre su rostro con el celular y él, con los ojos cerrados, la abraza con ternura.', focal: [36, 47], album: 'promesa' },
  'snapchat-1263949391': { caption: 'Créditos finales, manos unidas', alt: 'Manos entrelazadas en el apoyabrazos de un cine; ella lleva uñas rojas, pulsera y anillo; en la pantalla, los créditos.', focal: [59, 56], album: 'navidad' },
  'snapchat-1289450922': { caption: 'Contigo, a donde sea', alt: 'Él toma la mano de ella, con anillo y uñas rojas, en una terraza soleada con piso de madera y palmeras en macetas.', focal: [41, 66], album: 'navidad' },
  'snapchat-1301840404': { caption: 'Ese besito es mío', alt: 'Selfie cercano ante una pared gris: ella hace un gesto de beso y él mira a la cámara, con camiseta negra.', focal: [48, 42], album: 'navidad', sensitive: true },
  'snapchat-1417529378': { caption: 'Un beso bajo el sol', alt: 'Ella besa la mejilla de él en una terraza soleada con plantas y montañas al fondo; ambos visten de negro.', focal: [51, 45], album: 'navidad' },
  'snapchat-1443025198': { caption: 'Floreciendo a tu lado', alt: 'Selfie con filtro de lirios rosados ante una pared rosa; él apoya la cabeza sobre la de ella, que hace un gesto de beso.', focal: [73, 42], album: 'promesa' },
  'snapchat-1453561985': { caption: 'Un lazo rojo, una promesa', alt: 'Primer plano de la mano de ella, con anillo de piedra y un lazo rojo en el meñique, sobre la de él dentro de un auto.', focal: [59, 42], album: 'navidad' },
  'snapchat-1486392587': { caption: 'Helado para dos', alt: 'Dos vasos de helado rosado sobre una mesa blanca en una heladería, uno con trozos de galleta de chocolate.', focal: [49, 62], album: 'navidad' },
  'snapchat-1526890465': { caption: 'Tontos y felices, juntos', alt: 'Selfie de lado ante una pared rosa con filtro de mascarilla negra en ambos rostros; él sonríe y ella hace un gesto de beso.', focal: [46, 32], album: 'promesa' },
  'snapchat-1587974982': { caption: 'Tu mano encaja en la mía', alt: 'Él, con un tatuaje de dos bandas en el antebrazo, toma la mano de ella frente a una celosía de concreto calada.', focal: [59, 47], album: 'navidad' },
  'snapchat-1660846645': { caption: 'Brillas más que la Navidad', alt: 'Ella, de espaldas junto a la baranda de unas escaleras eléctricas, mira la decoración navideña de un centro comercial.', focal: [66, 30], album: 'navidad' },
  'snapchat-1662491053': { caption: 'Bigote falso, amor verdadero', alt: 'Selfie ante una pared rosa; un filtro pone gorra rosada, gafas y bigote a ella, que hace un gesto de beso, y él ríe.', focal: [68, 47], album: 'promesa' },
  'snapchat-1749745055': { caption: 'Domingo de maquinitas', alt: 'Foto en blanco y negro de él junto a una máquina de peluches, con una moneda en la mano; texto rojo 10:11, domingo 15.', focal: [69, 37], album: 'navidad' },
  'snapchat-1752092291': { caption: 'Juntitos frente a la pared rosa', alt: 'Selfie ante una pared rosa geométrica: él apoya la cabeza sobre la de ella, que lleva labios rojos y una flor en el pelo.', focal: [69, 46], album: 'promesa' },
  'snapchat-1765149437': { caption: 'Dulce como tú', alt: 'Primer plano de un vaso de helado rosado con trozos de galleta de chocolate y una cucharita roja.', focal: [38, 50], album: 'navidad' },
  'snapchat-1842129904': { caption: 'Jugando como niños', alt: 'Foto girada en una sala de videojuegos: él se inclina hacia una máquina de juego entre luces y pantallas de colores.', focal: [24, 52], album: 'navidad' },
  'snapchat-1893468568': { caption: 'De tu mano en el cine', alt: 'En el cine, la mano de ella con uñas rojas y anillo sostiene los dedos de él, que tiene un tatuaje en el antebrazo.', focal: [59, 60], album: 'navidad' },
  'snapchat-2006407731': { caption: 'Tu mejilla junto a la mía', alt: 'Selfie en blanco y negro en un espejo: la pareja abrazada mejilla con mejilla; texto rojo 11:05, domingo 15 de noviembre.', focal: [55, 35], album: 'navidad' },
  'snapchat-2009807858': { caption: 'Dos anillos, una sola historia', alt: 'Manos de la pareja sobre un pantalón negro; la de ella, con uñas rojas y anillo de piedra, descansa sobre la de él.', focal: [61, 48], album: 'navidad' },
  'snapchat-2010505454': { caption: 'Mi combo favorito eres tú', alt: 'Bandeja de comida rápida vista desde arriba con gaseosa, papas fritas, caja de pollo, salsas y una botella de agua.', focal: [50, 49], album: 'navidad' },
  'snapchat-2025221095': { caption: 'Abrazados frente al espejo', alt: 'Selfie en blanco y negro en un espejo: ella besa la mejilla de él con los ojos cerrados; texto rojo 11:05, domingo 15.', focal: [38, 33], album: 'navidad' },
  'snapchat-2032020944': { caption: 'Mi beso, tu mirada', alt: 'Selfie en blanco y negro en un espejo: él besa la sien de ella, que mira a la cámara; texto rojo 4:06, sábado 14.', focal: [46, 41], album: 'promesa' },
  'snapchat-2044010272': { caption: 'Tu flor, mi sonrisa', alt: 'Selfi de la pareja, de lado, frente a una pared rosa geométrica; él sonríe y ella lleva una flor en el cabello', focal: [53, 30], album: 'promesa' },
  'snapchat-2083224624': { caption: 'Un círculo para los dos', alt: 'La pareja junta dentro de un marco circular de tono cálido, frente a una pared rosa con líneas blancas', focal: [54, 53], album: 'promesa' },
  'wa-1794787078822': { caption: 'Tu besito entre lirios', alt: 'Selfi de la pareja con filtro de lirios rosados; ella lanza un beso y él sonríe ampliamente', focal: [48, 35], album: 'navidad' },
  'img-20261117-182112-063': { caption: 'Nuestra fecha, dibujada con amor', alt: 'Ilustración impresa de la pareja: ella besa la mejilla de él, con la fecha 18/05/26 y «Te Amo»', focal: [58, 38], album: 'despues' },
  'img-20261117-182120-660': { caption: 'Un día como hoy', alt: 'Tarjeta hecha a mano con ositos, una rosa y el mensaje «Feliz cumple mi amor»', focal: [49, 55], album: 'despues' },
  'img-20261117-182125-440': { caption: 'Dulces sorpresas de cumpleaños', alt: 'Caja de regalo abierta con «Feliz cumple» dibujado, pastelitos, dulces y rosas de cinta', focal: [50, 45], album: 'despues' },
  'img-20261117-182130-281': { caption: 'Detalles con superpoderes', alt: 'Letra H roja hecha a mano con telarañas y «Te Amo», junto a un cuadrito azul con dos animalitos abrazados', focal: [46, 45], album: 'despues' },
  'img-20261117-wa0029': { caption: '11:11, mi deseo eres tú', alt: 'Pantalla de bloqueo que marca las 11:11 a. m. del martes 17 de noviembre', focal: [18, 45], album: 'despues', hidden: true },
}

export const videoMeta: Record<string, VideoMeta> = {
  'snapchat-793747159': { title: 'Tu beso de sábado', alt: 'La pareja frente a una pared rosa; él apoya la cabeza con los ojos cerrados y ella lanza un beso', focal: [72, 48] },
  'snapchat-355221083': { title: 'Entre renos y guirnaldas', alt: 'Selfi en video de la pareja junto a renos y guirnaldas navideñas en un centro comercial', focal: [50, 36] },
  'snapchat-916844210': { title: 'La Navidad llegó temprano', alt: 'La pareja posa junto a decoración navideña con renos; él gira la cabeza hacia ella', focal: [49, 36] },
  'snapchat-1112331022': { title: 'Mirándonos bajo el cielo', alt: 'La pareja en una terraza soleada con montañas al fondo; ella apoya la cabeza en él y se miran', focal: [65, 52] },
  'snapchat-631735776': { title: 'Guiños que me enamoran', alt: 'Selfi en video: él sonríe ampliamente y ella guiña un ojo mientras lanza un beso', focal: [48, 28] },
  'snapchat-951627248': { title: 'Domingo en blanco y negro', alt: 'Video en blanco y negro de la pareja sonriendo, con la hora 11:52 del domingo 15 de noviembre', focal: [52, 32] },
  'snapchat-403413107': { title: 'Palomitas y miradas', alt: 'Video en blanco y negro de ella comiendo en una mesa con palomitas, una bebida y agua', focal: [65, 33] },
  'snapchat-321087198': { title: 'Mi piloto favorita', alt: 'Ella juega un videojuego de carreras de autos en una sala de juegos', focal: [28, 45] },
  'snapchat-1541229135': { title: 'Ahora me toca a mí', alt: 'Él juega un videojuego de carreras de motos en una sala de juegos', focal: [36, 32] },
  'snapchat-1235848729': { title: 'A toda velocidad', alt: 'Video largo de él inclinándose en una máquina de carreras de motos, grabado de lado', focal: [45, 40], hidden: true },
  'vid-20261116-wa0152': { title: 'Mi niña y su osito', alt: 'Ella, recostada junto a un gran oso de peluche, mira a la cámara con ternura', focal: [52, 28], sensitive: true },
}

/** Selecciones para cada parte de la página (ids en orden). */
export const picks = {
  /** Portada en celular (vertical). */
  heroPortrait: ['orig-30'],
  /** Portada en pantallas anchas (se muestra enmarcada sobre un fondo difuminado). */
  heroLandscape: ['orig-30'],
  /** Una foto por escena de la intro (ver intro.ts). La última es la misma de la portada. */
  intro: ['orig-31', 'img-20261117-182112-063', 'orig-29', 'img-20261115-170719-274', 'orig-30'],
  /** Carrusel 3D de recuerdos del inicio. */
  carousel: [
    'orig-26', 'img-20261114-154540-693', 'snapchat-982995529',
    'orig-32', 'img-20261114-155108-085', 'snapchat-1417529378',
    'orig-08', 'snapchat-528239701', 'img-20261116-wa0148',
    'snapchat-1059941455', 'snapchat-1168848582', 'orig-29',
  ],
  /** Corazón de fotos del final. */
  mosaic: [
    'orig-30', 'orig-26', 'orig-29',
    'orig-31', 'img-20261114-154540-693', 'snapchat-528239701',
    'snapchat-982995529', 'snapchat-1168848582', 'snapchat-1417529378',
    'orig-08', 'orig-15', 'orig-32',
    'img-20261115-100746-389', 'img-20261115-170719-274', 'img-20261116-wa0153',
    'snapchat-21002717', 'snapchat-409500696', 'snapchat-1059941455',
    'snapchat-1289450922', 'snapchat-1453561985', 'snapchat-1660846645',
    'snapchat-1752092291', 'snapchat-2009807858', 'orig-23',
    'img-20261114-154604-751', 'img-20261114-155018-962', 'img-20261116-wa0148',
    'snapchat-669948751', 'snapchat-480374076', 'orig-02',
    'orig-13', 'orig-20', 'img-20261114-154446-762',
    'img-20261114-154528-882', 'img-20261114-154600-537', 'img-20261114-154632-561',
    'snapchat-315219591', 'snapchat-410079293', 'snapchat-495190854',
    'snapchat-555295741', 'snapchat-657860156', 'snapchat-665361379',
    'snapchat-854535595', 'snapchat-901807615', 'snapchat-932758051',
    'snapchat-1007341462', 'snapchat-1032338464', 'snapchat-1247366724',
    'snapchat-1263949391', 'snapchat-1443025198', 'snapchat-1587974982',
    'snapchat-2044010272', 'wa-1794787078822', 'snapchat-982545511',
    'snapchat-1526890465',
  ],
  /** Filtro "Favoritas" de la galería. */
  favorites: [
    'orig-30', 'orig-26', 'img-20261114-154540-693',
    'snapchat-982995529', 'img-20261114-155108-085', 'snapchat-528239701',
    'snapchat-1417529378', 'orig-29', 'orig-31',
    'orig-32', 'orig-08', 'orig-15',
    'img-20261115-100746-389', 'snapchat-1168848582', 'img-20261115-170719-274',
    'img-20261116-wa0148', 'snapchat-1059941455', 'img-20261114-154604-751',
    'img-20261116-wa0153', 'snapchat-2044010272',
  ],
  /** Videos destacados en el inicio (la vista Momentos muestra todos). */
  moments: [
    'snapchat-1112331022', 'snapchat-793747159',
    'snapchat-631735776', 'snapchat-403413107',
    'snapchat-321087198', 'snapchat-355221083',
  ],
}
