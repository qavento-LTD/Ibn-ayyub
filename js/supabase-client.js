import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Functions ---
export async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });
    return { data, error };
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// --- Database Functions ---
export async function getProducts(category = null) {
    let query = supabase.from('products').select('*');
    if (category) {
        query = query.eq('category', category);
    }
    const { data, error } = await query;
    return { data, error };
}

export async function getProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

export async function addToCart(userId, productId, quantity = 1) {
    // Check if item exists
    const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select();
        return { data, error };
    } else {
        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ user_id: userId, product_id: productId, quantity }])
            .select();
        return { data, error };
    }
}

export async function getCartItems(userId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            quantity,
            product:products (*)
        `)
        .eq('user_id', userId);
    return { data, error };
}

export async function removeFromCart(itemId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
    return { error };
}

export async function updateCartQuantity(itemId, quantity) {
    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
    return { error };
}
