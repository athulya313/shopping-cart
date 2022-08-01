var db=require('../config/connection');
var collection=require('../config/collections');
const { response } = require('../app');
var objectId=require('mongodb').ObjectId

module.exports={
    addProduct:(product,callback)=>{
    
        db.get().collection('product').insertOne(product).then((data)=>
        { 
            
            callback(data.insertedId);
        })
    
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>
        {
           let products=await db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
           resolve(products)
        })
    },
    deleteProduct:(prodId)=>
    {
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTIONS).deleteOne({_id:objectId(prodId)}).then((response)=>{
    
            resolve(response)
            })
        }
        )
    },
    getProductDetail:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({_id:objectId(proId)}).then((product)=>
            {
                resolve(product)
            })

        })
    },
    updateProduct:(proId,prodDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTIONS).updateOne({_id:objectId(proId)},
            { 
                $set:{
                Name:prodDetails.Name,
                Description:prodDetails.Description,
                Category:prodDetails.Category,
                Price:prodDetails.Price

            
            }
        }).then((response)=>{
            resolve()
        })
            

        })
    }
}