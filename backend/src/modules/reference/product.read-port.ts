import { Product } from "./persistence/product.model.js"

export const ProductReadPort = {
  findActiveByIds: async (productIds: string[]) => {
    return Product.find({ _id: { $in: productIds }, active: true }).lean()
  },
}
