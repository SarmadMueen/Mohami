CREATE TABLE public.subscriptions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    plan_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'inactive', 'past_due')),
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.payment_orders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    wayl_order_id text,
    amount numeric NOT NULL,
    currency text NOT NULL,
    status text NOT NULL CHECK (status IN ('created', 'completed', 'failed')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Setup RLS for payment_orders
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payment orders" ON public.payment_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment orders" ON public.payment_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
