import { wishlistDataSource } from "@/infrastructure/data-source";

export async function syncWishlistToServer(productIds: string[]) {
  try {
    const serverIds = await wishlistDataSource.list("");
    for (const id of productIds) {
      if (!serverIds.includes(id)) {
        try { await wishlistDataSource.add("", id) } catch {}
      }
    }
    for (const id of serverIds) {
      if (!productIds.includes(id)) {
        try { await wishlistDataSource.remove("", id) } catch {}
      }
    }
  } catch {}
}

export async function addToWishlist(productId: string) {
  await wishlistDataSource.add("", productId);
}

export async function removeFromWishlist(productId: string) {
  await wishlistDataSource.remove("", productId);
}

export const wishlistService = {
  sync: syncWishlistToServer,
  add: addToWishlist,
  remove: removeFromWishlist,
};
