package org.govpraya.builder.generation;
import java.lang.reflect.*;
import org.bukkit.Material;
import org.bukkit.block.*;
import org.bukkit.block.data.BlockData;
import org.bukkit.persistence.PersistentDataContainer;
public final class PlacementPolicyProbe {
 static <T>T proxy(Class<T> type, java.util.function.Function<String,Object> values){return type.cast(Proxy.newProxyInstance(type.getClassLoader(),new Class<?>[]{type},(p,m,a)->values.apply(m.getName())));}
 static void accepted(String material,String state)throws Exception{Method m=TestWorldBridge.class.getDeclaredMethod("safe",BlockData.class);m.setAccessible(true);try{m.invoke(null,proxy(BlockData.class,n->n.equals("getMaterial")?Material.valueOf(material):state));}catch(InvocationTargetException e){throw (Exception)e.getCause();}}
 static void rejected(String material,String state)throws Exception{try{accepted(material,state);throw new AssertionError("Accepted "+material);}catch(IllegalArgumentException expected){}}
 public static void main(String[]args)throws Exception{
  for(String name:new String[]{"POPPY","DANDELION","SHORT_GRASS","BLUE_BED","WATER_CAULDRON","IRON_BARS","SPRUCE_DOOR"})accepted(name,"minecraft:"+name.toLowerCase());
  rejected("BLUE_BED","minecraft:blue_bed[occupied=true]");rejected("WATER","minecraft:water");rejected("SMOKER","minecraft:smoker");rejected("TNT","minecraft:tnt");rejected("OAK_SLAB","minecraft:oak_slab[waterlogged=true]");
  PersistentDataContainer empty=proxy(PersistentDataContainer.class,n->true),custom=proxy(PersistentDataContainer.class,n->false);
  TestWorldBridge.checkExisting(proxy(Bed.class,n->n.equals("getBlockData")?proxy(BlockData.class,k->"minecraft:blue_bed[occupied=false]"):empty));
  for(BlockState state:new BlockState[]{proxy(Bed.class,n->custom),proxy(Smoker.class,n->empty)}){try{TestWorldBridge.checkExisting(state);throw new AssertionError("Block entity accepted");}catch(IllegalArgumentException expected){}}
  System.out.println("PLACEMENT_POLICY_PASS static fixtures, empty bed, occupied/custom bed and inventory/fluid rejection");
 }
}
