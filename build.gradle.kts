plugins {
    java
}

group = "org.govpraya"
version = "0.2.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://maven.enginehub.org/repo/")
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.11-R0.1-SNAPSHOT")
    compileOnly("com.sk89q.worldedit:worldedit-bukkit:7.4.0")
}

// The regression probes use the same server-provided libraries, without a test framework.
configurations.testImplementation {
    extendsFrom(configurations.compileOnly.get())
}

tasks.register("prepareRegressionTests") {
    dependsOn(tasks.testClasses)
    doLast {
        layout.buildDirectory.file("regression-classpath.txt").get().asFile
            .writeText(sourceSets.test.get().runtimeClasspath.asPath)
    }
}

tasks.register<Jar>("smokeTestJar") {
    dependsOn(tasks.testClasses)
    archiveClassifier.set("smoke-test")
    from(sourceSets.test.get().output)
    from("src/smoke/resources")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release.set(21)
}

tasks.processResources {
    filesMatching("plugin.yml") {
        expand("version" to project.version)
    }
}
