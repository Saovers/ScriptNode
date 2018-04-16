db.restaurants.update(
    { name:"Vella" },
    { $set:
       {
         cuisine:"MisAJours",
       }
    }
 )