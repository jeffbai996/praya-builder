package org.govpraya.builder.generation;

import com.google.gson.*;
import com.sk89q.worldedit.WorldEdit;
import com.sk89q.worldedit.bukkit.BukkitAdapter;
import com.sk89q.worldedit.math.BlockVector3;
import com.sk89q.worldedit.util.SideEffectSet;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.block.TileState;
import org.bukkit.block.data.BlockData;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.*;

/** Opt-in loopback adapter. It cannot select arbitrary worlds or execute commands. */
public final class TestWorldBridge implements AutoCloseable {
    private final JavaPlugin plugin;
    private final HttpServer server;
    private final ExecutorService worker;
    private final String token;
    private final String worldName;
    private final boolean readOnly;
    private final int[] minimum, maximum;
    private static final Gson JSON = new Gson();
    private static final Set<String> ALLOWED = Set.of("AIR","CAVE_AIR","VOID_AIR","STONE","STONE_BRICKS","DIRT","GRASS_BLOCK","GOLD_BLOCK","SMOOTH_QUARTZ","QUARTZ_BLOCK","GRAY_CONCRETE","LIGHT_GRAY_CONCRETE","WHITE_CONCRETE","BIRCH_PLANKS","DARK_OAK_PLANKS","STRIPPED_OAK_WOOD","OAK_LOG","GLASS","OAK_LEAVES","SEA_LANTERN","BOOKSHELF","WHITE_WOOL","GREEN_TERRACOTTA","GRAY_TERRACOTTA","SMOOTH_QUARTZ_SLAB","QUARTZ_STAIRS","DARK_OAK_STAIRS","GLASS_PANE","BRICKS","WHITE_STAINED_GLASS_PANE","LIGHT_GRAY_STAINED_GLASS_PANE","CAULDRON","POLISHED_ANDESITE_SLAB","POLISHED_BLACKSTONE","OAK_SLAB","LIGHT_GRAY_CARPET","WHITE_CARPET","LANTERN","OAK_TRAPDOOR","OAK_DOOR","POLISHED_DEEPSLATE","SMOOTH_STONE","SMOOTH_STONE_SLAB");

    public TestWorldBridge(JavaPlugin plugin) throws IOException {
        this.plugin = plugin;
        token = required("BUILDER_BRIDGE_TOKEN");
        if (token.length() < 32) throw new IllegalArgumentException("Bridge token must have at least 32 characters");
        worldName = required("BUILDER_TEST_WORLD");
        readOnly = "1".equals(System.getenv("BUILDER_BRIDGE_READ_ONLY"));
        minimum = vector(required("BUILDER_TEST_MIN"));
        maximum = vector(required("BUILDER_TEST_MAX"));
        long volume = 1;
        for (int i=0;i<3;i++) { int length=maximum[i]-minimum[i]; if(length<=0||length>128)throw new IllegalArgumentException("Invalid reserved test bounds"); volume*=length; }
        if(volume>262144)throw new IllegalArgumentException("Reserved test plot exceeds survey budget");
        int port = Integer.parseInt(System.getenv().getOrDefault("BUILDER_BRIDGE_PORT", "8094"));
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 8);
        worker = new ThreadPoolExecutor(1,1,0L,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(16),new ThreadPoolExecutor.AbortPolicy());
        server.setExecutor(worker);
        server.createContext("/", this::handle);
        server.start();
        if ("1".equals(System.getenv("BUILDER_TEST_PRELOAD"))) {
            Bukkit.getScheduler().runTask(plugin, () -> {
                World isolated = world();
                if(!readOnly&&"1".equals(System.getenv("BUILDER_TEST_FREEZE_RANDOM_TICKS")))isolated.setGameRule(org.bukkit.GameRule.RANDOM_TICK_SPEED,0);
                for(int x=minimum[0]>>4;x<=(maximum[0]-1)>>4;x++)for(int z=minimum[2]>>4;z<=(maximum[2]-1)>>4;z++) {
                    if(!isolated.loadChunk(x,z,!readOnly)){plugin.getLogger().warning("Survey chunk is unavailable: "+x+","+z);continue;}
                    isolated.addPluginChunkTicket(x,z,plugin);
                }
            });
        }
        plugin.getLogger().info("Isolated construction bridge listening on loopback port " + port);
    }
    private static String required(String key) { String v=System.getenv(key); if(v==null||v.isBlank())throw new IllegalArgumentException("Missing "+key);return v; }
    private static int[] vector(String s) { String[] parts=s.split(","); if(parts.length!=3)throw new IllegalArgumentException("Invalid bounds vector");return new int[]{Integer.parseInt(parts[0]),Integer.parseInt(parts[1]),Integer.parseInt(parts[2])}; }
    private static int integer(JsonObject o,String key) { double n=o.get(key).getAsDouble(); if(!Double.isFinite(n)||n!=Math.rint(n)||Math.abs(n)>30000000)throw new IllegalArgumentException("Invalid coordinate");return (int)n; }
    private World world() { World w=Bukkit.getWorld(worldName);if(w==null)throw new IllegalArgumentException("Configured isolated world is not loaded");return w; }
    private void bounds(World world,int x,int y,int z) {
        int[] p={x,y,z};for(int i=0;i<3;i++)if(p[i]<minimum[i]||p[i]>=maximum[i])throw new IllegalArgumentException("Outside reserved plot");
        if(y<world.getMinHeight()||y>=world.getMaxHeight())throw new IllegalArgumentException("Outside world height");
        if(!world.isChunkLoaded(x>>4,z>>4))throw new IllegalArgumentException("Test chunk is not loaded; implicit generation is disabled");
    }
    private static void safe(BlockData data) {
        String n=data.getMaterial().name();
        if(!ALLOWED.contains(n))throw new IllegalArgumentException("Block not in tested placement allowlist: "+n);
        if(n.contains("WATER")||n.contains("LAVA")||n.contains("SAND")||n.equals("GRAVEL")||n.contains("CONCRETE_POWDER")||n.contains("REDSTONE")||n.contains("PISTON")||n.contains("TNT")||n.contains("FIRE")||n.contains("PORTAL")||n.contains("COMMAND")||n.contains("STRUCTURE")||n.contains("SCULK")||n.contains("SPAWNER")||n.contains("OBSERVER")||n.contains("DISPENSER")||n.contains("DROPPER")||n.contains("HOPPER")||n.contains("CHEST")||n.contains("BARREL")||n.contains("FURNACE")||n.contains("SMOKER")||n.contains("SIGN")||n.contains("BANNER")||n.contains("SHULKER")||n.contains("LECTERN")||n.contains("CAMPFIRE")||n.contains("BEE")||n.contains("BREWING"))throw new IllegalArgumentException("Block outside isolated placement policy: "+n);
        if(data.getAsString().contains("waterlogged=true"))throw new IllegalArgumentException("Waterlogged writes are disabled");
    }
    private JsonObject process(String route,JsonObject input) throws Exception {
        World world=world();JsonObject out=new JsonObject();
        if(route.equals("/status")){out.addProperty("connected",true);out.addProperty("world",world.getName());out.addProperty("worldId",world.getUID().toString());out.add("minimum",JSON.toJsonTree(minimum));out.add("maximum",JSON.toJsonTree(maximum));out.addProperty("dataVersion",Bukkit.getUnsafe().getDataVersion());JsonObject capabilities=new JsonObject();capabilities.addProperty("survey",1);capabilities.addProperty("placement",readOnly?0:1);capabilities.addProperty("batchCells",128);out.add("capabilities",capabilities);return out;}
        if(!world.getUID().toString().equals(input.get("worldId").getAsString()))throw new IllegalArgumentException("World identity mismatch");
        JsonArray cells=input.getAsJsonArray(route.equals("/read")||route.equals("/survey")?"cells":"changes");
        if(cells==null||cells.size()>128)throw new IllegalArgumentException("Bridge batch limit exceeded");
        Set<String> unique=new HashSet<>();
        for(JsonElement value:cells){JsonObject c=value.getAsJsonObject();int x=integer(c,"x"),y=integer(c,"y"),z=integer(c,"z");bounds(world,x,y,z);if(!unique.add(x+","+y+","+z))throw new IllegalArgumentException("Duplicate batch cell");}
        if(route.equals("/read")){JsonArray states=new JsonArray();for(JsonElement value:cells){JsonObject c=value.getAsJsonObject();states.add(world.getBlockAt(integer(c,"x"),integer(c,"y"),integer(c,"z")).getBlockData().getAsString());}out.add("states",states);return out;}
        if(route.equals("/survey")){JsonArray states=new JsonArray(),entities=new JsonArray();for(int i=0;i<cells.size();i++){JsonObject c=cells.get(i).getAsJsonObject();var block=world.getBlockAt(integer(c,"x"),integer(c,"y"),integer(c,"z"));states.add(block.getBlockData().getAsString());if(block.getState() instanceof TileState)entities.add(i);}out.add("states",states);out.add("blockEntities",entities);return out;}
        ArrayList<BlockData> intended=new ArrayList<>(),before=new ArrayList<>();
        for(JsonElement value:cells){JsonObject c=value.getAsJsonObject();BlockData a=Bukkit.createBlockData(c.get("block").getAsString()),b=Bukkit.createBlockData(c.get("before").getAsString());safe(a);safe(b);intended.add(a);before.add(b);if(world.getBlockAt(integer(c,"x"),integer(c,"y"),integer(c,"z")).getState() instanceof TileState)throw new IllegalArgumentException("Existing block-entity data is outside placement policy");}
        if(route.equals("/validate")){out.addProperty("valid",true);return out;}
        int applied=0;long started=System.nanoTime();
        try(var edit=WorldEdit.getInstance().newEditSession(BukkitAdapter.adapt(world))) {
        edit.setBlockChangeLimit(128);
        edit.setSideEffectApplier(SideEffectSet.none());
        for(int i=0;i<cells.size();i++){
            JsonObject c=cells.get(i).getAsJsonObject();var block=world.getBlockAt(integer(c,"x"),integer(c,"y"),integer(c,"z"));
            if(!block.getBlockData().equals(before.get(i)))break;
            if(!edit.setBlock(BlockVector3.at(block.getX(),block.getY(),block.getZ()),BukkitAdapter.adapt(intended.get(i))))break;
            applied++;
            if(System.nanoTime()-started>4_000_000)break;
        }
        } // Closing flushes the bounded edit; reported time includes that work.
        out.addProperty("applied",applied);out.addProperty("ms",(System.nanoTime()-started)/1_000_000.0);return out;
    }
    private void handle(HttpExchange exchange) throws IOException {
        try {
            String auth=exchange.getRequestHeaders().getFirst("Authorization");
            if(auth==null||!MessageDigest.isEqual(auth.getBytes(StandardCharsets.UTF_8),("Bearer "+token).getBytes(StandardCharsets.UTF_8))){respond(exchange,401,"Authentication required");return;}
            String route=exchange.getRequestURI().getPath();boolean status=route.equals("/status"),write=route.equals("/read")||route.equals("/survey")||route.equals("/batch")||route.equals("/validate");
            if(!status&&!write){respond(exchange,404,"Unknown bridge operation");return;}
            if(readOnly&&(route.equals("/batch")||route.equals("/validate"))){respond(exchange,403,"This adapter only reads surveys");return;}
            if(!exchange.getRequestMethod().equals(status?"GET":"POST")){respond(exchange,405,"Method not allowed");return;}
            byte[] bytes=exchange.getRequestBody().readNBytes(131073);if(bytes.length>131072){respond(exchange,413,"Bridge request limit exceeded");return;}
            JsonObject body=status?new JsonObject():JsonParser.parseString(new String(bytes,StandardCharsets.UTF_8)).getAsJsonObject();
            // Only detached request data crosses threads. The HTTP worker never reads the world.
            Future<JsonObject> future=Bukkit.getScheduler().callSyncMethod(plugin,()->process(route,body));
            JsonObject result;
            try { result=future.get(10,TimeUnit.SECONDS); }
            catch(TimeoutException timeout){future.cancel(false);throw timeout;}
            byte[] output=JSON.toJson(result).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(200,output.length);exchange.getResponseBody().write(output);
        }catch(Exception error){Throwable cause=error.getCause()==null?error:error.getCause();respond(exchange,400,cause.getMessage()==null?"Bridge operation failed":cause.getMessage());}
        finally{exchange.close();}
    }
    private static void respond(HttpExchange exchange,int status,String message)throws IOException{JsonObject error=new JsonObject();error.addProperty("error",message);byte[] bytes=JSON.toJson(error).getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);}
    @Override public void close(){server.stop(0);worker.shutdownNow();World w=Bukkit.getWorld(worldName);if(w!=null)w.removePluginChunkTickets(plugin);}
}
