var db=require('../config/connection');
var collection=require('../config/collections');
const bcrypt=require('bcrypt');
const { response } = require('express');
var objectId=require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path');

var instance = new Razorpay({
  key_id: 'rzp_test_rDh4MqJPMCmbqP',
  
  key_secret: 'JRZjXZuex37eEn4LELOrIrD7'
});

module.exports={
    doSignUp:(userData)=>{
        return new Promise(async(resolve,reject)=>
        {
           userData.Password=await bcrypt.hash(userData.Password,10)
           db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then((data)=>{
            resolve(data.insertedId);

           })
        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTIONS).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                console.log('login success')
                response.user=user
                response.status=true
                resolve(response)
            }else{
                console.log('failed')
                resolve({status:false})
            }
            
        })
    }else{
        console.log('login failed')
        resolve({status:false})
    }
    
    })
},
addToCart:(proId,userId)=>{
    let proObj={
        item:objectId(proId),
        quantity:1
    }
    return new Promise(async(resolve,reject)=>{
     let userCart=await db.get().collection(collection.CART_COLLECTIONS).findOne({user:objectId(userId)})
      if(userCart){
        let proExist=userCart.products.findIndex(product=>product.item==proId)
        console.log(proExist)
        if(proExist!=-1)
        {
            db.get().collection(collection.CART_COLLECTIONS).updateOne({'products.item':objectId(proId),user:objectId(userId)},
            {
                $inc:{'products.$.quantity':1}
            }
            ).then(()=>
            {
                resolve()
            })

        }
        else{
        db.get().collection(collection.CART_COLLECTIONS).updateOne({user:objectId(userId)},
        {
            
                $push:{products:proObj}
            
        }).then((response)=>{
             resolve()
        })
    }
     }else{
        let cartObj={
            user:objectId(userId),
            products:[proObj]
        }
        db.get().collection(collection.CART_COLLECTIONS).insertOne(cartObj).then((response)=>{
            resolve()
        })
     }
    })
     
},
   getCartProducts:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        let cartItems=await db.get().collection(collection.CART_COLLECTIONS).aggregate([{
           $match:{user:objectId(userId)} 
        },
        {
            $unwind:'$products'
        },
        {
            $project:{
              item :'$products.item',
              quantity:'$products.quantity'
        }

        },
        {
            $lookup:{
                from:collection.PRODUCT_COLLECTIONS,
                localField:'item',
                foreignField:'_id',
                as:'productdetail'

            }
        },
        {
            $project:{
                item:1,quantity:1,productdetail:{$arrayElemAt:['$productdetail',0]}
            
            }
        }
        

     ]).toArray()
      resolve(cartItems)
         
    
    })
   },
   getCartCount:(userId)=>
   {
    return new Promise(async(resolve,reject)=>{
      let count=0
   
       let cart=await db.get().collection(collection.CART_COLLECTIONS).findOne({user:objectId(userId)})
       if(cart){
       count=cart.products.length
       }
       resolve(count)
    })
   },
   changeProductQuantity:(details)=>{
    count=parseInt(details.count)
    quantity=parseInt(details.quantity)

    return new Promise((resolve,reject)=>{
        if(count==-1&& quantity==1)
        {
            db.get().collection(collection.CART_COLLECTIONS).updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
            }).then((response)=>{
                resolve({removeProduct:true})
            })
        }else{
        db.get().collection(collection.CART_COLLECTIONS).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
                $inc:{'products.$.quantity':count}
            }
            ).then((response)=>
            {
        
                resolve({status:true})
            })
        }
    })

   },
      RemoveProduct:(details)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTIONS).updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
            }
            ).then((response)=>{
                  resolve({status:true})
                 
            })
        })

      },
      getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTIONS).aggregate([{
               $match:{user:objectId(userId)} 
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                  item :'$products.item',
                  quantity:'$products.quantity'
            }
    
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTIONS,
                    localField:'item',
                    foreignField:'_id',
                    as:'productdetail'
    
                }
            },
            {
                $project:{
                    item:1,quantity:1,productdetail:{$arrayElemAt:['$productdetail',0]}
                
                }
            },
            {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:['$quantity',{$convert:{input:'$productdetail.Price',to:'int'}}]}}
                }
            }
            
    
         ]).toArray()
         resolve(total[0].total)
             
        
        })
       },
       getCartCount:(userId)=>
       {
        return new Promise(async(resolve,reject)=>{
          let count=0
       
           let cart=await db.get().collection(collection.CART_COLLECTIONS).findOne({user:objectId(userId)})
           if(cart){
           count=cart.products.length
           }
           resolve(count)
        })
       },
       placeOrder:(order,products,total)=>{
          return new Promise((resolve,reject)=>{
          let status=order['payment-method']==='COD'?'placed':'pending'
         let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                total:total,
                status:status,
                date:new Date()  
             }
             db.get().collection(collection.ORDER_COLLECTIONS).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTIONS).deleteOne({user:objectId(order.userId)})
                
                resolve(response.insertedId)
             })
          })
       },
       getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTIONS).findOne({user:objectId(userId)})
              resolve(cart.products)
        })
       },
       getUserOrders:(userId)=>{
          return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTIONS).find({userId:objectId(userId)}).toArray()
            resolve(orders)
          })
       },
       getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([{
               $match:{_id:objectId(orderId)} 
            },
             {
                $unwind:'$products'
            },
            {
                $project:{
                  item :'$products.item',
                  quantity:'$products.quantity'
            }
    
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTIONS,
                    localField:'item',
                    foreignField:'_id',
                    as:'productdetail'
    
                }
            },
            {
                $project:{
                    item:1,quantity:1,productdetail:{$arrayElemAt:['$productdetail',0]}
                
                }
            }
            
    
         ]).toArray()
          resolve(orderItems)
             
        
        })

       },
       generateRazorPay:(orderId,total)=>{
          return new Promise((resolve,reject)=>{
            console.log(orderId);
           var options= {
            amount:total*100,
            currency:"INR",
            receipt:""+orderId
           };
          
instance.orders.create(options, function(err, order){
    if(err){
        console.log(err);
    }else{

   console.log("new order:",order); 
   resolve(order)
    }
})
            
            });
          
       },
       verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto=require('crypto');
            let hmac=crypto.createHmac('sha256', 'JRZjXZuex37eEn4LELOrIrD7')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex') 
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
       },
       changeOrderStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            console.log(orderId);
            db.get().collection(collection.ORDER_COLLECTIONS)
            .updateOne({_id:objectId(orderId)},
            {
              $set:{
                status:'placed'
            }
            }).then(()=>{
                resolve()
            })

    
        })
       },
       orderDetails:()=>{
        return new Promise(async(resolve,reject)=>{
           let orderedItems=await db.get().collection(collection.ORDER_COLLECTIONS).find().toArray()
           resolve(orderedItems)
        })

       },
       ChangeShippingStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            console.log(orderId);
            db.get().collection(collection.ORDER_COLLECTIONS)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'shipped'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
       },
       getUser:()=>{
        return new Promise((resolve,reject)=>{
            let userdetail=db.get().collection(collection.USER_COLLECTIONS).find().toArray()
            resolve(userdetail)
         }) 
        
       },
       getProducts:()=>{
        return new Promise((resolve,reject)=>{
            let productdetail=db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
            resolve(productdetail)
         }) 
        
       },
       getStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            let status=db.get().collection(collection.ORDER_COLLECTIONS).findOne({_id:objectId(orderId)})
            resolve(status)
            
        })
       },
       getUserDetail:(userId)=>{
        return new Promise((resolve,reject)=>{
            console.log(userId);
            let profiledetail=db.get().collection(collection.USER_COLLECTIONS).findOne({_id:objectId(userId)})
            resolve(profiledetail)
            
        })
       }
      
      
    
    }  
      

