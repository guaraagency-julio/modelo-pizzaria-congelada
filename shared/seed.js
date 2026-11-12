// Dados fictícios do protótipo. Substituir por informações do cliente antes de vender.
const photos = [
 "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=900&q=85&fit=crop",
 "https://images.unsplash.com/photo-1548365328-8b849e6c7b8d?w=900&q=85&fit=crop"
];
const rows = [
 ["Margherita da Casa","Molho de tomate italiano, mozzarella, manjericão fresco e azeite.",45.9,"Clássicas",0,"Mais pedida"],
 ["Calabresa Artesanal","Calabresa artesanal, cebola roxa, mozzarella e orégano.",49.9,"Clássicas",1,""],
 ["Quatro Queijos","Mozzarella, gorgonzola, provolone e parmesão.",54.9,"Especiais",2,"Cremosa"],
 ["Pepperoni & Mel","Pepperoni, mozzarella e toque de mel picante.",57.9,"Especiais",3,"Destaque"],
 ["Portuguesa da Vila","Presunto, ovo, cebola, azeitonas e mozzarella.",52.9,"Clássicas",4,""],
 ["Parma & Rúcula","Presunto parma, rúcula, parmesão e tomate confit.",62.9,"Especiais",5,""],
 ["Funghi Trufado","Cogumelos salteados, mozzarella e azeite trufado.",61.9,"Especiais",6,"Vegetariana"],
 ["Frango com Catupiry","Frango desfiado, requeijão cremoso e milho.",50.9,"Clássicas",7,""],
 ["Marguerita de Búfala","Mozzarella de búfala, tomate-cereja e manjericão.",59.9,"Especiais",0,"Vegetariana"],
 ["Bacon & Alho-Poró","Bacon crocante, alho-poró e creme de queijo.",56.9,"Especiais",1,""],
 ["Abobrinha & Limão","Abobrinha, ricota temperada e raspas de limão siciliano.",53.9,"Vegetarianas",2,"Vegetariana"],
 ["Brie com Geleia","Queijo brie, geleia de pimenta e nozes.",63.9,"Especiais",3,""],
 ["Cinco Formaggi","Blend de cinco queijos e ervas aromáticas.",64.9,"Especiais",4,""],
 ["Napolitana","Tomate em rodelas, parmesão, alho e mozzarella.",48.9,"Clássicas",5,"Vegetariana"],
 ["Carne de Panela","Carne desfiada lentamente, cebola caramelizada e queijo.",61.9,"Especiais",6,""],
 ["Caprese Pesto","Tomate-cereja, mozzarella, pesto e manjericão.",56.9,"Vegetarianas",7,"Vegetariana"],
 ["Costela & Barbecue","Costela bovina desfiada, barbecue da casa e cebola.",63.9,"Especiais",1,""],
 ["Milho com Bacon","Milho doce, bacon, mozzarella e toque de pimenta.",49.9,"Clássicas",3,""],
 ["Chocolate & Morango","Chocolate ao leite e morango — pizza doce para finalizar.",52.9,"Doces",2,"Doce"],
 ["Doce de Leite & Nozes","Doce de leite, nozes crocantes e canela.",53.9,"Doces",4,"Doce"]
];
export const SEED = {
 version: 1,
 demo: true,
 updatedAt: "2026-11-12T12:00:00-03:00",
 settings: {
  brand: "Pronta Pizzaria",
  subtitle: "Pizzas artesanais congeladas",
  whatsapp: "5551991825024",
  instagram: "",
  city: "Novo Hamburgo · RS",
  headline: "Sua pizza favorita, quentinha no seu forno.",
  description: "Pizzas artesanais congeladas, com ingredientes selecionados e todo o sabor de uma pizza feita com carinho. Você escolhe a hora de assar e aproveitar.",
  deliveryNote: "Consulte disponibilidade, taxa de entrega e horário pelo WhatsApp.",
  pickupNote: "Endereço de retirada informado na confirmação do pedido."
 },
 products: rows.map((r,i) => ({
  id: "pizza-"+String(i+1).padStart(2,"0"),
  name:r[0], description:r[1], price:r[2], category:r[3],
  image:photos[r[4]], tag:r[5], active:true
 })),
 stockOut: {},
 schedules: {
  "2026-11":[["pizza-01","pizza-02","pizza-03","pizza-04"],["pizza-05","pizza-06","pizza-07","pizza-08"],["pizza-09","pizza-10","pizza-11","pizza-12"],["pizza-13","pizza-14","pizza-15","pizza-16"]],
  "2026-12":[["pizza-17","pizza-18","pizza-19","pizza-20"],["pizza-01","pizza-06","pizza-09","pizza-11"],["pizza-02","pizza-05","pizza-13","pizza-16"],["pizza-03","pizza-07","pizza-12","pizza-15"]],
  "2027-01":[["pizza-04","pizza-08","pizza-10","pizza-14"],["pizza-01","pizza-09","pizza-16","pizza-17"],["pizza-02","pizza-06","pizza-11","pizza-18"],["pizza-03","pizza-05","pizza-15","pizza-19"]]
 }
};
