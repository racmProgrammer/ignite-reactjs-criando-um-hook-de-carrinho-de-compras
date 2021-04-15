import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExist = updatedCart.find(product => product.id === productId);

      const stockVerify = await api.get(`http://localhost:3333/stock/${productId}`);

      const stockAmount = stockVerify.data.amount;
      const currentAmount = productExist ? productExist.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExist){
        productExist.amount = amount;
      }else{
        const product = await api.get(`http://localhost:3333/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart =  [...cart];
      const cartIndex = updatedCart.findIndex(product => product.id === productId);
      
      if(cartIndex >= 0){
        updatedCart.splice(cartIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else{
        throw Error();
      }
      
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }
      const responseStock = await api.get(`http://localhost:3333/stock/${productId}`);
      const stockAmount = responseStock.data.amount;

      if(stockAmount >= amount){
        
        const updatedCart = [...cart];
        const productExists = updatedCart.find(product => product.id === productId);
        
        if(productExists){
          productExists.amount = amount;
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        }else{
          throw Error();
        }
      }else{
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
