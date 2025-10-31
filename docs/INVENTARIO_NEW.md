Nuevos requerimientos funcionales (NeuroCore – Inventario con paquetes/combos)
FR-NC-INV-004 – Soporte de tipos de ítem de inventario

Descripción: El sistema debe permitir que cada registro de inventario tenga un tipo de ítem:

PRODUCTO_SIMPLE (stock directo, ej. “Alfajor”).

PAQUETE_FIJO (mismo producto repetido, ej. “Paquete 25 alfajores S/ 20”).

COMBO_MIXTO (varios productos y cantidades, ej. “Combo alfajores + sándwiches + empanadas S/ 100”).

Given el cliente tiene NeuroCore activo,

When se crea o sincroniza un ítem de inventario,

Then se debe poder indicar su tipo.

Reglas:

Si el cliente no tiene activado “paquetes y combos”, solo se permiten PRODUCTO_SIMPLE.

Si lo tiene activado, se habilitan PAQUETE_FIJO y COMBO_MIXTO.

El tipo debe quedar almacenado en BD para que la IA lo pueda usar.

Campos clave (BD):

item_id, item_name, item_type (PRODUCTO_SIMPLE | PAQUETE_FIJO | COMBO_MIXTO), is_combo_enabled (bool por cliente).

FR-NC-INV-005 – Definición de paquete fijo (mismo producto, cantidad fija, precio fijo)

Descripción: Permite definir un paquete que está compuesto solo por un producto base en una cantidad fija y tiene un precio empaquetado distinto al unitario (ej. 25 alfajores = S/ 20).

Given el cliente tiene habilitado “paquetes y combos”,

When crea un paquete,

Then puede:

elegir el producto base,

definir la cantidad incluida (ej. 25),

definir el precio del paquete,

definir si el paquete consume stock del producto base.

Reglas:

Si consume_stock = true → cada venta del paquete descuenta 25 alfajores del inventario del producto base.

Si consume_stock = false → se asume que el paquete se maneja como SKU independiente (algunos clientes lo llevan separado). [ASUNCIÓN]

El precio del paquete no tiene que ser = precio_unitario × cantidad.

Campos clave (BD):

Tabla package_definitions: package_id, base_item_id, quantity_included, package_price, consume_stock (bool), currency.

FR-NC-INV-006 – Definición de combo mixto (varios productos, cantidades y precio fijo)

Descripción: Permite crear un ítem “combo” que contiene n componentes, cada uno apuntando a un producto real y con su cantidad requerida, y que se vende por un precio fijo total.

Given el cliente tiene habilitado “paquetes y combos”,

When crea un combo,

Then puede:

darle un nombre comercial (ej. “Combo desayuno corporativo”),

asignarle un precio fijo (ej. S/ 100),

agregar 1..n componentes, cada uno con:

item_id (ej. Alfajor, Empanada, Sándwich),

quantity (ej. 20 alfajores, 10 empanadas, 5 sándwiches),

consume_stock (por componente).

Reglas:

El combo se guarda como un ítem más en inventario (item_type = COMBO_MIXTO).

Cada componente puede tener su propia política de consumo.

El total del combo no se calcula sumando los precios de los componentes: el precio es fijo.

Campos clave (BD):

Tabla combo_headers: combo_id, combo_name, combo_price, currency, is_active, client_id.

Tabla combo_items: combo_item_id, combo_id, component_item_id, component_qty, consume_stock (bool).

FR-NC-INV-007 – Explosión de componentes al vender / registrar movimiento

Descripción: Cuando se registra una venta o un movimiento de salida de un PAQUETE_FIJO o COMBO_MIXTO, el sistema debe poder “explotar” (descomponer) ese ítem en los productos simples que lo conforman para efectos de stock.

Given se vende 1 combo “alfajores + empanadas”,

When se registra la venta,

Then el sistema debe:

Identificar que es un COMBO_MIXTO,

Leer sus componentes,

Por cada componente con consume_stock = true, descontar el stock correspondiente (ej. 20 alfajores, 10 empanadas).

Reglas:

Si un componente no tiene stock suficiente, el sistema debe:

marcar el movimiento como “parcial” o

generar una alerta de stock bajo para ese componente. [ASUNCIÓN]

La explosión debe quedar registrada (para que el dashboard pueda mostrar “este combo consumió estos productos”).

Campos clave (BD):

Tabla inventory_movements: agregar campo exploded_from_item_id y JSON components_consumed (lista de {item_id, qty}).

FR-NC-INV-008 – Visibilidad condicional de combos en el Portal

Descripción: No todos los clientes de NeuroCore usarán combos; para los que no, la UI debe seguir mostrando solo inventario plano.

Given el cliente no tiene activado “paquetes y combos”,

When accede a /neurocore/inventario,

Then la UI no debe mostrar pestañas o acciones de “Combos” o “Paquetes”.

Given el cliente sí lo tiene activado,

When accede a inventario,

Then ve pestañas/segmentos: Productos, Paquetes, Combos.

Reglas:

Esto debe estar gobernado por el entitlement del cliente.

El sidebar (JSON que te di) debe poder tener una sección “Combos” que aparezca solo si está habilitado.

FR-NC-INV-009 – Reportes y KPIs que entienden combos

Descripción: Los KPIs de inventario y ventas deben poder contar ventas de combos sin perder el desglose por producto.

Given existen ventas donde se vendieron combos,

When el usuario ve KPIs de inventario/ventas,

Then debe poder elegir la vista:

Por ítem vendido (combo cuenta como 1 línea),

Por componentes (el combo se rompe y cuenta cada alfajor/empanada).

Reglas:

Útil para clientes de alimentos/conveniencia.

Debe existir un filtro “incluir combos como componentes”.

Campos clave (BD):

Campo en reportes o vista materializada: include_combo_breakdown (bool).

Claves de modelo de datos (para que la IA “lo vea”)

Incluye esto en tu esquema/base para que la IA pueda generar código/consultas:

Cliente / Tenant

client_id

features → incluir algo como "inventoryCombos": true/false

Inventario base (inventory_items)

item_id

client_id

name

sku

item_type (PRODUCTO_SIMPLE | PAQUETE_FIJO | COMBO_MIXTO)

stock_qty

unit_price

Paquetes (package_definitions)

package_id

client_id

base_item_id

quantity_included

package_price

consume_stock

Combos (combo_headers / combo_items)

combo_id, client_id, combo_name, combo_price, currency

combo_items → component_item_id, component_qty, consume_stock

Movimientos (inventory_movements)

movement_id

client_id

source (ventas / ajuste / combo)

item_id (lo que se vendió)

exploded_from_item_id (si este movimiento viene de un combo)

components_consumed (JSON)

Feature flags / entitlements

client_id

feature_code = "NC_INVENTORY_COMBOS"

enabled = true/false

Puntos clave de negocio

No obligatorio: el feature se activa por cliente o por contrato.

Precio del combo es fijo: no depende de los precios de los componentes.

Consumo de stock configurable: por combo completo y por componente.

Explosión necesaria para analítica: para que NeuroCore pueda decir “vendiste 200 alfajores”, aunque 150 hayan salido dentro de combos.

UI condicional: si no tiene el feature, la UI no cambia.

Trazabilidad: cada venta de combo debe poder reconstruirse hasta los productos simples.

Cómo lo contaría la IA (few-shot)

“Crea un combo llamado ‘Combo desayuno’ de S/ 100 que incluya 20 alfajores y 10 empanadas, que sí descuente stock de ambos.”

“Muéstrame las ventas de alfajores incluyendo las que salieron en combos.”

“Activa la funcionalidad de combos para el cliente ACME.”

“Genera un reporte de inventario explosivo (por componentes).”